const express = require('express');

module.exports = function(pool) {
  const router = express.Router();
  
  // In-memory cart endpoints
  let cart = [];

  router.get('/', (req, res) => {
    res.json(cart);
  });

  router.post('/agregar', (req, res) => {
    const { id, nombre, precio, cantidad } = req.body;
    const productoExistente = cart.find(item => item.id === id);

    if (productoExistente) {
      productoExistente.cantidad += cantidad;
    } else {
      cart.push({ id, nombre, precio, cantidad });
    }

    res.json({ mensaje: 'Producto agregado al carrito', carrito: cart });
  });

  router.delete('/eliminar/:id', (req, res) => {
    const id = parseInt(req.params.id);
    cart = cart.filter(item => item.id !== id);
    res.json({ mensaje: 'Producto eliminado', carrito: cart });
  });

  router.get('/total', (req, res) => {
    const total = cart.reduce((sum, item) => sum + item.precio * item.cantidad, 0);
    res.json({ total });
  });

  
  router.post('/comprar', async (req, res) => {
    try {
      if (!req.session?.userId) return res.status(401).json({ mensaje: 'Debes iniciar sesión para comprar' })

      const userId = req.session.userId
      const { items, total } = req.body

      if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ mensaje: 'Carrito vacío' })

      const conn = await pool.getConnection()
      try {
        await conn.beginTransaction()
        
        // Primero validar todos los productos y verificar stock
        const productosValidados = []
        for (const it of items) {
          let pid = (it.id !== undefined && it.id !== null && it.id !== '') ? Number.parseInt(it.id) : null
          const qty = Number.parseInt(it.quantity)
          let price = Number.parseFloat(it.price)

          if ((!pid || Number.isNaN(pid)) && it.name) {
            const [prodRows] = await conn.execute('SELECT id, precio, stock FROM productos WHERE nombre = ? LIMIT 1', [it.name])
            if (Array.isArray(prodRows) && prodRows.length > 0) {
              pid = prodRows[0].id
              if (!price || Number.isNaN(price)) price = Number.parseFloat(prodRows[0].precio) || 0
            }
          }

          if (!pid || Number.isNaN(pid) || !qty || qty <= 0) {
            await conn.rollback()
            conn.release()
            return res.status(400).json({ mensaje: 'Datos de carrito inválidos' })
          }
          
          // Verificar stock disponible
          const [stockCheck] = await conn.execute('SELECT stock FROM productos WHERE id = ?', [pid])
          if (!stockCheck || stockCheck.length === 0) {
            await conn.rollback()
            conn.release()
            return res.status(400).json({ mensaje: 'Producto no encontrado' })
          }
          
          const stockDisponible = stockCheck[0].stock
          if (stockDisponible < qty) {
            await conn.rollback()
            conn.release()
            return res.status(400).json({ mensaje: `Stock insuficiente. Solo quedan ${stockDisponible} unidades disponibles` })
          }
          
          productosValidados.push({ pid, qty, price })
        }
        
        // Crear la compra principal
        const [compraResult] = await conn.execute('INSERT INTO compras (id_usuario, total) VALUES (?, ?)', [userId, total])
        const compraId = compraResult.insertId
        
        // Obtener saldo actual del usuario
        const [userRows] = await conn.execute('SELECT sueldo FROM usuario WHERE id = ?', [userId])
        
        if (userRows.length === 0) {
          await conn.rollback()
          conn.release()
          return res.status(404).json({ mensaje: 'Usuario no encontrado' })
        }
        
        const saldoActual = Number(userRows[0].sueldo) || 0
        
        // Validar que el usuario tenga saldo suficiente
        if (saldoActual < total) {
          await conn.rollback()
          conn.release()
          return res.status(400).json({ 
            mensaje: `Saldo insuficiente. Saldo actual: $${saldoActual.toFixed(2)}, Total de compra: $${total.toFixed(2)}` 
          })
        }
        
        // Descontar el total del saldo del usuario
        const nuevoSaldo = saldoActual - total
        await conn.execute('UPDATE usuario SET sueldo = ? WHERE id = ?', [nuevoSaldo, userId])
        
        console.log('💰 Saldo descontado:', {
          userId: userId,
          saldoAnterior: saldoActual.toFixed(2),
          totalCompra: total.toFixed(2),
          nuevoSaldo: nuevoSaldo.toFixed(2)
        })
        
        // Crear los detalles de la compra y actualizar stock
        for (const producto of productosValidados) {
          const { pid, qty, price } = producto
          
          // Insertar detalle de compra
          await conn.execute('INSERT INTO detalle_compra (id_compra, id_pan, cantidad) VALUES (?, ?, ?)', [compraId, pid, qty])
          
          // Descontar stock
          await conn.execute('UPDATE productos SET stock = stock - ? WHERE id = ?', [qty, pid])
          
          // Si el stock llega a 0, desactivar el producto
          await conn.execute('UPDATE productos SET activo = 0 WHERE id = ? AND stock <= 0', [pid])
        }
        
        // Generar número de venta único
        const numeroVenta = `V-${compraId}-${Date.now().toString().slice(-6)}`
        
        // Crear ticket en la base de datos
        await conn.execute(
          'INSERT INTO ticket (id_usuario, id_compra, fecha_compra, total_pagar, numero_venta) VALUES (?, ?, NOW(), ?, ?)',
          [userId, compraId, total, numeroVenta]
        )
        
        await conn.commit()
        conn.release()
        
        return res.json({ 
          mensaje: 'Compra realizada exitosamente', 
          compraId: compraId, 
          total: total,
          saldoAnterior: saldoActual.toFixed(2),
          nuevoSaldo: nuevoSaldo.toFixed(2),
          saldoDescontado: total.toFixed(2),
          numeroVenta: numeroVenta
        })
      } catch (err) {
        await conn.rollback().catch(()=>{})
        conn.release()
        console.error('Error inserting compra:', err)
        return res.status(500).json({ mensaje: 'Error al procesar la compra' })
      }
    } catch (err) {
      console.error('Error en /carrito/comprar:', err)
      return res.status(500).json({ mensaje: 'Error del servidor' })
    }
  })

  // Obtener historial de compras del usuario
  router.get('/historial', async (req, res) => {
    try {
      if (!req.session?.userId) return res.status(401).json({ mensaje: 'Debes iniciar sesión' })

      const userId = req.session.userId
      
      const [compras] = await pool.execute(`
        SELECT 
          c.id,
          c.total,
          c.fecha,
          COUNT(dc.id) as total_productos
        FROM compras c
        LEFT JOIN detalle_compra dc ON c.id = dc.id_compra
        WHERE c.id_usuario = ?
        GROUP BY c.id, c.total, c.fecha
        ORDER BY c.fecha DESC
      `, [userId])

      res.json(compras)
    } catch (err) {
      console.error('Error obteniendo historial:', err)
      res.status(500).json({ mensaje: 'Error al obtener historial' })
    }
  })

  // Obtener detalles de una compra específica
  router.get('/compra/:id', async (req, res) => {
    try {
      if (!req.session?.userId) return res.status(401).json({ mensaje: 'Debes iniciar sesión' })

      const userId = req.session.userId
      const compraId = req.params.id

      // Verificar que la compra pertenece al usuario
      const [compraCheck] = await pool.execute('SELECT id, total, fecha FROM compras WHERE id = ? AND id_usuario = ?', [compraId, userId])
      if (!compraCheck || compraCheck.length === 0) {
        return res.status(404).json({ mensaje: 'Compra no encontrada' })
      }

      // Obtener detalles de la compra
      const [detalles] = await pool.execute(`
        SELECT 
          dc.cantidad,
          p.id as producto_id,
          p.nombre,
          p.precio,
          (dc.cantidad * p.precio) as subtotal
        FROM detalle_compra dc
        JOIN productos p ON dc.id_pan = p.id
        WHERE dc.id_compra = ?
      `, [compraId])

      res.json({
        compra: compraCheck[0],
        detalles: detalles
      })
    } catch (err) {
      console.error('Error obteniendo detalles de compra:', err)
      res.status(500).json({ mensaje: 'Error al obtener detalles' })
    }
  })

  // Obtener ticket de una compra
  router.get('/ticket/:compraId', async (req, res) => {
    try {
      if (!req.session?.userId) return res.status(401).json({ mensaje: 'Debes iniciar sesión' })

      const userId = req.session.userId
      const compraId = req.params.compraId

      // Obtener información del ticket
      const [ticketRows] = await pool.execute(`
        SELECT 
          t.id,
          t.fecha_compra,
          t.total_pagar,
          t.numero_venta,
          u.username
        FROM ticket t
        JOIN usuario u ON t.id_usuario = u.id
        WHERE t.id_compra = ? AND t.id_usuario = ?
      `, [compraId, userId])

      if (!ticketRows || ticketRows.length === 0) {
        return res.status(404).json({ mensaje: 'Ticket no encontrado' })
      }

      const ticket = ticketRows[0]

      // Obtener productos de la compra
      const [productos] = await pool.execute(`
        SELECT 
          p.nombre,
          p.precio,
          dc.cantidad,
          (p.precio * dc.cantidad) as subtotal
        FROM detalle_compra dc
        JOIN productos p ON dc.id_pan = p.id
        WHERE dc.id_compra = ?
      `, [compraId])

      res.json({
        negocio: 'La Desesperanza',
        numeroVenta: ticket.numero_venta,
        fecha: ticket.fecha_compra,
        username: ticket.username,
        productos: productos,
        total: ticket.total_pagar
      })
    } catch (err) {
      console.error('Error obteniendo ticket:', err)
      res.status(500).json({ mensaje: 'Error al obtener ticket' })
    }
  })

  return router
}
