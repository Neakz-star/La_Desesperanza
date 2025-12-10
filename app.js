require('dotenv').config()
const express = require('express')
const session = require('express-session')
const MySQLStore = require('express-mysql-session')(session)
const mysql = require('mysql2/promise')
const path = require('path')
const http = require('http')
const { Server } = require('socket.io')

// Validar variables de entorno críticas
const requiredEnvVars = ['MYSQL_HOST', 'MYSQL_USER', 'MYSQL_DATABASE', 'SESSION_SECRET']
const missingVars = requiredEnvVars.filter(varName => !process.env[varName])

if (missingVars.length > 0) {
	console.error('❌ Variables de entorno faltantes:', missingVars.join(', '))
	console.log('💡 Asegúrate de que el archivo .env existe y contiene todas las variables necesarias')
	process.exit(1)
}

const app = express()
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Conexión a MySQL
const pool = mysql.createPool({
	host: process.env.MYSQL_HOST,
	port: process.env.MYSQL_PORT || 40609,
	user: process.env.MYSQL_USER,
	password: process.env.MYSQL_PASSWORD,
	database: process.env.MYSQL_DATABASE,
	waitForConnections: true,
	connectionLimit: 10,
	queueLimit: 0,
	acquireTimeout: 60000,
	timeout: 60000,
	ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
})

// Verificar conexión a MySQL
pool.getConnection()
	.then(connection => {
		console.log('✅ Conexión a MySQL establecida')
		connection.release()
	})
	.catch(err => {
		console.error('❌ Error conectando a MySQL:', err.message)
		console.log('⚠️  El servidor continuará sin base de datos')
	})

const sessionStore = new MySQLStore({}, pool)

app.use(session({
	key: 'sid',
	secret: process.env.SESSION_SECRET,
	store: sessionStore,
	resave: false,
	saveUninitialized: false,
	cookie: {
		maxAge: 1000 * 60 * 60 * 24, // 24 horas
		httpOnly: true,
		secure: false,
		sameSite: 'lax'
	}
}))

app.use(express.static(path.join(__dirname, '/public'), {
    setHeaders: (res, path) => {
        if (path.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript')
        }
    }
}))

// Socket.io - Manejo de conexiones en tiempo real
const server = http.createServer(app)
const io = new Server(server)

io.on('connection', (socket) => {
    console.log('🔌 Nuevo usuario conectado:', socket.id)

    // Recibir coordenadas del usuario
    socket.on('userCoordinates', (coords) => {
        console.log('📍 Coordenadas recibidas de', socket.id, ':', coords)
        // Emitir a todos los demás usuarios (broadcast)
        socket.broadcast.emit('userNewCoordinates', {
            id: socket.id,
            coords: coords
        })
    })

    // Usuario desconectado
    socket.on('disconnect', () => {
        console.log('🔌 Usuario desconectado:', socket.id)
        // Notificar a otros usuarios que este usuario se desconectó
        socket.broadcast.emit('userDisconnected', socket.id)
    })
})

const carritoRoutes = require('./routes/carrito')(pool)
app.use('/carrito', carritoRoutes)

app.get('/api/productos', async (req, res) => {
    try {
        const [productos] = await pool.query(`
            SELECT id, nombre, descripcion, tipo, precio, stock, img, temporada, activo 
            FROM productos 
            WHERE activo = 1 AND stock > 0
            ORDER BY temporada, nombre
        `)
        
        const grouped = productos.reduce((acc, prod) => {
            const season = prod.temporada || 'General'
            if (!acc[season]) acc[season] = []
            acc[season].push(prod)
            return acc
        }, {})
        
        res.json(grouped)
    } catch (error) {
        console.error('Error al obtener productos:', error)
        res.status(500).json({ error: 'Error al obtener productos' })
    }
})

// Rutas de autenticación
app.post('/login', async (req, res) => {
	try {
		const { username, password } = req.body

		// Validación de entrada
		if (!username || !password) {
			return res.status(400).json({ mensaje: 'Usuario y contraseña son requeridos' })
		}

		if (username.trim().length < 3) {
			return res.status(400).json({ mensaje: 'El usuario debe tener al menos 3 caracteres' })
		}

	const [rows] = await pool.execute('SELECT * FROM usuario WHERE username = ?', [username])

		if (rows.length === 0) {
			return res.status(401).json({ mensaje: 'Usuario o contraseña incorrecta' })
		}

		const user = rows[0]

            
			if (user.password !== password) {
				return res.status(401).json({ mensaje: 'Usuario o contraseña incorrecta' })
			}

	// Establecer la sesión
		req.session.userId = user.id
		req.session.username = user.username
		req.session.admin = user.admin === 1 || user.admin === '1'

        
		res.json({ mensaje: 'Has iniciado sesión correctamente', admin: req.session.admin, username: req.session.username })
	} catch (error) {
		console.error('Error en login:', error)
		// Error de conexión a la base de datos
		if (error.code && (error.code.startsWith('ER_') || error.code === 'ECONNREFUSED')) {
			return res.status(500).json({ mensaje: 'Error de conexión con la base de datos. Por favor, intente más tarde.' })
		}
		res.status(500).json({ mensaje: 'Error interno del servidor al procesar el inicio de sesión' })
	}
})

// Verificar si el usuario está autenticado
app.get('/check-auth', (req, res) => {
	if (req.session && req.session.userId) {
		res.json({ 
			loggedIn: true, 
			username: req.session.username, 
			admin: req.session.admin 
		})
	} else {
		res.json({ loggedIn: false })
	}
})

// Registro de usuarios
app.post('/register', async (req, res) => {
	try {
		const { username, password } = req.body
		
		// Validación de entrada
		if (!username || !password) {
			return res.status(400).json({ mensaje: 'Usuario y contraseña son requeridos' })
		}
		
		if (username.trim().length < 3) {
			return res.status(400).json({ mensaje: 'El usuario debe tener al menos 3 caracteres' })
		}
		
		if (password.length < 6) {
			return res.status(400).json({ mensaje: 'La contraseña debe tener al menos 6 caracteres' })
		}

	const [rows] = await pool.execute('SELECT id FROM usuario WHERE username = ?', [username])
		if (rows.length > 0) return res.status(409).json({ mensaje: 'El nombre de usuario ya está registrado' })

	await pool.execute('INSERT INTO usuario (username, password, admin) VALUES (?, ?, 0)', [username, password])

		res.json({ mensaje: 'Usuario creado correctamente' })
	} catch (err) {
		console.error('Error register:', err)
		// Error de conexión a la base de datos
		if (err.code && (err.code.startsWith('ER_') || err.code === 'ECONNREFUSED')) {
			return res.status(500).json({ mensaje: 'Error de conexión con la base de datos. Por favor, intente más tarde.' })
		}
		res.status(500).json({ mensaje: 'Error interno del servidor al registrar usuario' })
	}
})

// Rutas para manejo de saldo
// Obtener saldo del usuario
app.get('/saldo', (req, res) => {
	if (!req.session.userId) {
		return res.status(401).json({ mensaje: 'Debes iniciar sesión' })
	}

	pool.execute('SELECT sueldo FROM usuario WHERE id = ?', [req.session.userId])
		.then(([rows]) => {
			if (rows.length === 0) {
				return res.status(404).json({ mensaje: 'Usuario no encontrado' })
			}
			const saldo = Number(rows[0].sueldo) || 0
			res.json({ saldo: saldo.toFixed(2) })
		})
		.catch(err => {
			console.error('Error al obtener saldo:', err)
			res.status(500).json({ mensaje: 'Error al obtener saldo' })
		})
})

// Agregar saldo
app.post('/saldo/agregar', async (req, res) => {
	if (!req.session.userId) {
		return res.status(401).json({ mensaje: 'Debes iniciar sesión' })
	}

	try {
		const { monto } = req.body

		// Validar que el monto sea un número positivo
		const montoNum = Number(monto)
		if (isNaN(montoNum) || montoNum <= 0) {
			return res.status(400).json({ mensaje: 'El monto debe ser un número positivo' })
		}

		// Validar que sea un número real (no imaginario ni infinito)
		if (!Number.isFinite(montoNum)) {
			return res.status(400).json({ mensaje: 'El monto debe ser un número válido' })
		}

		// Obtener saldo actual
		const [rows] = await pool.execute('SELECT sueldo FROM usuario WHERE id = ?', [req.session.userId])
		
		if (rows.length === 0) {
			return res.status(404).json({ mensaje: 'Usuario no encontrado' })
		}

		const saldoActual = Number(rows[0].sueldo) || 0
		const nuevoSaldo = saldoActual + montoNum

		// Validar límite máximo
		if (nuevoSaldo > 999999999999) {
			return res.status(400).json({ 
				success: false,
				mensaje: 'La suma del saldo actual ($' + saldoActual.toFixed(2) + ') más el monto a agregar ($' + montoNum.toFixed(2) + ') supera el máximo permitido de $999,999,999,999'
			})
		}

		// Actualizar saldo
		await pool.execute('UPDATE usuario SET sueldo = ? WHERE id = ?', [nuevoSaldo, req.session.userId])

		console.log('✅ Saldo actualizado:', {
			userId: req.session.userId,
			saldoAnterior: saldoActual,
			montoAgregado: montoNum,
			nuevoSaldo: nuevoSaldo
		})

		res.json({ 
			success: true,
			mensaje: 'Saldo agregado correctamente', 
			saldoAnterior: saldoActual.toFixed(2),
			montoAgregado: montoNum.toFixed(2),
			nuevoSaldo: nuevoSaldo.toFixed(2)
		})
	} catch (err) {
		console.error('Error al agregar saldo:', err)
		if (err.code && (err.code.startsWith('ER_') || err.code === 'ECONNREFUSED')) {
			return res.status(500).json({ success: false, mensaje: 'Error de conexión con la base de datos' })
		}
		res.status(500).json({ success: false, mensaje: 'Error al agregar saldo' })
	}
})

app.post('/logout', (req, res) => {
	req.session.destroy(err => {
		if (err) return res.status(500).json({ mensaje: 'Error al cerrar sesión' })
		res.clearCookie('sid')
		res.json({ mensaje: 'Has cerrado sesión' })
	})
})

function requireAuth(req, res, next) {
	if (req.session?.userId) return next()
	res.status(401).json({ mensaje: 'No autorizado' })
}

function requireAdmin(req, res, next) {
	if (req.session?.admin) return next()
	res.status(403).json({ mensaje: 'No autorizado - admin' })
}

app.get('/perfil', requireAuth, (req, res) => {
	res.json({ id: req.session.userId, usuario: req.session.username, admin: req.session.admin })
})

// Endpoint para validar URLs de imágenes
app.post('/validate-image-url', requireAdmin, async (req, res) => {
	console.log('=== VALIDATE IMAGE URL REQUEST ===')
	console.log('User session:', req.session?.userId ? 'Authenticated' : 'Not authenticated')
	
	try {
		const { imageUrl } = req.body
		
		if (!imageUrl || typeof imageUrl !== 'string') {
			return res.status(400).json({ mensaje: 'URL de imagen requerida' })
		}
		
		// Validar que sea una URL válida
		let url
		try {
			url = new URL(imageUrl)
		} catch (e) {
			return res.status(400).json({ mensaje: 'URL de imagen inválida' })
		}
		
		// Validar que sea HTTP o HTTPS
		if (!['http:', 'https:'].includes(url.protocol)) {
			return res.status(400).json({ mensaje: 'La URL debe usar protocolo HTTP o HTTPS' })
		}
		
		// Detectar URLs de Google Images y sugerir alternativa
		if (url.hostname.includes('google.com') && imageUrl.includes('url?sa=i')) {
			return res.status(400).json({ 
				mensaje: 'No se pueden usar URLs de Google Images. Por favor, usa la URL directa de la imagen. Haz clic derecho en la imagen → "Copiar dirección de imagen"' 
			})
		}
		
		// Validar extensión de imagen (opcional pero recomendado)
		const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']
		const hasImageExtension = imageExtensions.some(ext => 
			url.pathname.toLowerCase().includes(ext)
		)
		
		// Si no tiene extensión de imagen, advertir pero permitir
		if (!hasImageExtension) {
			console.warn('URL sin extensión de imagen detectada:', imageUrl)
			return res.json({ 
				mensaje: 'Advertencia: La URL no parece ser una imagen directa, pero se permitirá',
				imageUrl: imageUrl,
				valid: true,
				warning: true
			})
		}
		
		console.log('✅ URL de imagen validada:', imageUrl)
		res.json({ 
			mensaje: 'URL de imagen válida',
			imageUrl: imageUrl,
			valid: true
		})
	} catch (error) {
		console.error('Error validating image URL:', error)
		res.status(500).json({ mensaje: 'Error interno al validar la URL de imagen' })
	}
})

// Endpoint para sugerir URLs de imágenes de ejemplo
app.get('/example-images', (req, res) => {
	const examples = [
		{
			name: 'Concha de chocolate',
			url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500&h=500&fit=crop',
			description: 'Pan dulce tradicional mexicano'
		},
		{
			name: 'Croissant',
			url: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=500&h=500&fit=crop',
			description: 'Hojaldre francés clásico'
		},
		{
			name: 'Pan de masa madre',
			url: 'https://images.unsplash.com/photo-1583738712333-5a3df2aa3be1?w=500&h=500&fit=crop',
			description: 'Pan artesanal fermentado'
		},
		{
			name: 'Dona glaseada',
			url: 'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=500&h=500&fit=crop',
			description: 'Dona artesanal con glaseado'
		}
	]
	
	res.json({
		mensaje: 'URLs de ejemplo para productos de panadería',
		examples: examples,
		instructions: [
			'1. Para usar imágenes de Google: haz clic derecho en la imagen → "Copiar dirección de imagen"',
			'2. Usa servicios como Unsplash, Pixabay o similares para imágenes libres',
			'3. Asegúrate de que la URL termine en .jpg, .png, .gif o .webp',
			'4. Evita URLs que contengan "google.com/url?" ya que son redirecciones'
		]
	})
})
app.get('/admin', requireAdmin, (req, res) => {
	res.sendFile(path.join(__dirname, 'public', 'admin.html'))
})

// ADMIN: listar usuarios
app.get('/admin/users', requireAdmin, async (req, res) => {
	try {
		const [rows] = await pool.execute('SELECT id, username, admin FROM usuario ORDER BY id ASC')
		res.json(rows)
	} catch (err) {
		console.error('Error getting users:', err)
		res.status(500).json({ mensaje: 'Error al obtener usuarios' })
	}
})

// ADMIN: alternar rol admin de un usuario
app.post('/admin/users/:id/toggle-admin', requireAdmin, async (req, res) => {
	try {
		const userId = req.params.id
	const [rows] = await pool.execute('SELECT id, admin FROM usuario WHERE id = ?', [userId])
		if (rows.length === 0) return res.status(404).json({ mensaje: 'Usuario no encontrado' })
		const user = rows[0]
		const newAdmin = user.admin === 1 ? 0 : 1
		await pool.execute('UPDATE usuario SET admin = ? WHERE id = ?', [newAdmin, userId])
		res.json({ id: userId, admin: newAdmin })
	} catch (err) {
		console.error('Error toggling admin:', err)
		if (err.code && (err.code.startsWith('ER_') || err.code === 'ECONNREFUSED')) {
			return res.status(500).json({ mensaje: 'Error de conexión con la base de datos' })
		}
		res.status(500).json({ mensaje: 'Error interno del servidor al actualizar usuario' })
	}
})

// ADMIN: eliminar usuario
app.delete('/admin/users/:id', requireAdmin, async (req, res) => {
	try {
		const userId = req.params.id
		
		// Validación de entrada
		if (!userId || isNaN(parseInt(userId, 10))) {
			return res.status(400).json({ mensaje: 'ID de usuario inválido' })
		}
		
		await pool.execute('DELETE FROM usuario WHERE id = ?', [userId])
		res.json({ id: userId })
	} catch (err) {
		console.error('Error deleting user:', err)
		if (err.code && (err.code.startsWith('ER_') || err.code === 'ECONNREFUSED')) {
			return res.status(500).json({ mensaje: 'Error de conexión con la base de datos' })
		}
		res.status(500).json({ mensaje: 'Error interno del servidor al eliminar usuario' })
	}
})

// ADMIN: obtener TODOS los productos (activos e inactivos)
app.get('/admin/productos', requireAdmin, async (req, res) => {
	try {
		const [rows] = await pool.execute('SELECT id, nombre, descripcion, tipo, precio, stock, img, temporada, activo FROM productos ORDER BY nombre ASC')
		res.json(rows)
	} catch (err) {
		console.error('Error getting all productos:', err)
		if (err.code && (err.code.startsWith('ER_') || err.code === 'ECONNREFUSED')) {
			return res.status(500).json({ mensaje: 'Error de conexión con la base de datos' })
		}
		res.status(500).json({ mensaje: 'Error interno del servidor al obtener productos' })
	}
})

// Public: obtener productos activos
app.get('/productos', async (req, res) => {
	try {
		const [rows] = await pool.execute('SELECT id, nombre, descripcion, tipo, precio, stock, img, temporada, activo FROM productos WHERE activo = 1 AND stock > 0 ORDER BY nombre ASC')
		res.json(rows)
	} catch (err) {
		console.error('Error getting productos:', err)
		if (err.code && (err.code.startsWith('ER_') || err.code === 'ECONNREFUSED')) {
			return res.status(500).json({ mensaje: 'Error de conexión con la base de datos' })
		}
		res.status(500).json({ mensaje: 'Error interno del servidor al obtener productos' })
	}
})

// Public: productos agrupados por temporada
app.get('/productos/por-temporada', async (req, res) => {
	try {
		const [rows] = await pool.execute('SELECT id, nombre, descripcion, tipo, precio, stock, img, temporada, activo FROM productos WHERE activo = 1 AND stock > 0 ORDER BY temporada ASC, nombre ASC')
		const grouped = {}
		for (const p of rows) {
			const t = p.temporada || 'General'
			if (!grouped[t]) grouped[t] = []
			grouped[t].push(p)
		}
		res.json(grouped)
	} catch (err) {
		console.error('Error grouping productos:', err)
		if (err.code && (err.code.startsWith('ER_') || err.code === 'ECONNREFUSED')) {
			return res.status(500).json({ mensaje: 'Error de conexión con la base de datos' })
		}
		res.status(500).json({ mensaje: 'Error interno del servidor al obtener productos por temporada' })
	}
})

// ADMIN: CRUD de productos
app.post('/admin/productos', requireAdmin, async (req, res) => {
	try {
		const { nombre, descripcion, tipo, precio, stock, img, temporada, activo } = req.body
		
		// Validaciones del servidor
		if (!nombre || nombre.trim().length < 3) {
			return res.status(400).json({ mensaje: 'El nombre del producto debe tener al menos 3 caracteres' })
		}
		
		const precioNum = parseFloat(precio)
		if (isNaN(precioNum) || precioNum < 0) {
			return res.status(400).json({ mensaje: 'El precio debe ser un número positivo' })
		}
		
		const stockNum = parseInt(stock || 0, 10)
		if (isNaN(stockNum) || stockNum < 0) {
			return res.status(400).json({ mensaje: 'El stock debe ser un número entero positivo' })
		}
		
		// Si no hay stock, desactivar automáticamente el producto
		const activoFinal = (stockNum > 0 && activo) ? 1 : 0
		
		const shortImg = img && typeof img === 'string' && img.length > 200 ? img.slice(0,200) + '...[truncated]' : img
		console.log('ADMIN Create producto payload:', { nombre, descripcion, tipo, precio: precioNum, stock: stockNum, img: shortImg, temporada, activo: activoFinal })
		const [r] = await pool.execute('INSERT INTO productos (nombre, descripcion, tipo, precio, stock, img, temporada, activo) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [nombre.trim(), descripcion, tipo, precioNum, stockNum, img || null, temporada || null, activoFinal])
		res.json({ id: r.insertId })
	} catch (err) {
		console.error('Error creating producto:', err)
		if (err.code && (err.code.startsWith('ER_') || err.code === 'ECONNREFUSED')) {
			return res.status(500).json({ mensaje: 'Error de conexión con la base de datos' })
		}
		res.status(500).json({ mensaje: 'Error interno del servidor al crear producto' })
	}
})

app.put('/admin/productos/:id', requireAdmin, async (req, res) => {
	try {
		const id = req.params.id
		
		// Validar ID
		if (!id || isNaN(Number(id))) {
			return res.status(400).json({ mensaje: 'ID de producto inválido' })
		}
		
		const { nombre, descripcion, tipo, precio, stock, img, temporada, activo } = req.body
		
		// Validaciones del servidor
		if (!nombre || nombre.trim().length < 3) {
			return res.status(400).json({ mensaje: 'El nombre del producto debe tener al menos 3 caracteres' })
		}
		
		const precioNum = parseFloat(precio)
		if (isNaN(precioNum) || precioNum < 0) {
			return res.status(400).json({ mensaje: 'El precio debe ser un número positivo' })
		}
		
		const stockNum = parseInt(stock || 0, 10)
		if (isNaN(stockNum) || stockNum < 0) {
			return res.status(400).json({ mensaje: 'El stock debe ser un número entero positivo' })
		}
		
		// Si no hay stock, desactivar automáticamente el producto
		const activoFinal = (stockNum > 0 && activo) ? 1 : 0
		
		const shortImgUp = img && typeof img === 'string' && img.length > 200 ? img.slice(0,200) + '...[truncated]' : img
		console.log('ADMIN Update producto', id, { nombre, descripcion, tipo, precio: precioNum, stock: stockNum, img: shortImgUp, temporada, activo: activoFinal })
		await pool.execute('UPDATE productos SET nombre = ?, descripcion = ?, tipo = ?, precio = ?, stock = ?, img = ?, temporada = ?, activo = ? WHERE id = ?', [nombre.trim(), descripcion, tipo, precioNum, stockNum, img || null, temporada || null, activoFinal, id])
		res.json({ id })
	} catch (err) {
		console.error('Error updating producto:', err)
		if (err.code && (err.code.startsWith('ER_') || err.code === 'ECONNREFUSED')) {
			return res.status(500).json({ mensaje: 'Error de conexión con la base de datos' })
		}
		res.status(500).json({ mensaje: 'Error interno del servidor al actualizar producto' })
	}
})

app.delete('/admin/productos/:id', requireAdmin, async (req, res) => {
	try {
		const id = req.params.id
		
		// Validar ID
		if (!id || isNaN(Number(id))) {
			return res.status(400).json({ mensaje: 'ID de producto inválido' })
		}
		
		await pool.execute('DELETE FROM productos WHERE id = ?', [id])
		res.json({ id })
	} catch (err) {
		console.error('Error deleting producto:', err)
		if (err.code && (err.code.startsWith('ER_') || err.code === 'ECONNREFUSED')) {
			return res.status(500).json({ mensaje: 'Error de conexión con la base de datos' })
		}
		res.status(500).json({ mensaje: 'Error interno del servidor al eliminar producto' })
	}
})

// ADMIN: alternar estado activo de un producto
app.post('/admin/productos/:id/toggle-active', requireAdmin, async (req, res) => {
	try {
		const id = req.params.id
		
		// Validar ID
		if (!id || isNaN(Number(id))) {
			return res.status(400).json({ mensaje: 'ID de producto inválido' })
		}
		
		const [rows] = await pool.execute('SELECT id, activo FROM productos WHERE id = ?', [id])
		if (rows.length === 0) return res.status(404).json({ mensaje: 'Producto no encontrado' })
		const producto = rows[0]
		const newActivo = producto.activo === 1 ? 0 : 1
		await pool.execute('UPDATE productos SET activo = ? WHERE id = ?', [newActivo, id])
		res.json({ id, activo: newActivo })
	} catch (err) {
		console.error('Error toggling activo:', err)
		if (err.code && (err.code.startsWith('ER_') || err.code === 'ECONNREFUSED')) {
			return res.status(500).json({ mensaje: 'Error de conexión con la base de datos' })
		}
		res.status(500).json({ mensaje: 'Error interno del servidor al cambiar estado del producto' })
	}
})

// ADMIN: obtener todas las compras
app.get('/admin/compras', requireAdmin, async (req, res) => {
	try {
		const [compras] = await pool.execute(`
			SELECT 
				c.id,
				c.id_usuario,
				u.username,
				c.total,
				c.fecha,
				COUNT(dc.id) as total_productos
			FROM compras c
			JOIN usuario u ON c.id_usuario = u.id
			LEFT JOIN detalle_compra dc ON c.id = dc.id_compra
			GROUP BY c.id, c.id_usuario, u.username, c.total, c.fecha
			ORDER BY c.fecha DESC
		`)
		res.json(compras)
	} catch (err) {
		console.error('Error getting compras:', err)
		if (err.code && (err.code.startsWith('ER_') || err.code === 'ECONNREFUSED')) {
			return res.status(500).json({ mensaje: 'Error de conexión con la base de datos' })
		}
		res.status(500).json({ mensaje: 'Error interno del servidor al obtener compras' })
	}
})

// ADMIN: obtener detalles de una compra específica
app.get('/admin/compras/:id', requireAdmin, async (req, res) => {
	try {
		const compraId = req.params.id
		
		// Validar ID
		if (!compraId || Number.isNaN(Number(compraId))) {
			return res.status(400).json({ mensaje: 'ID de compra inválido' })
		}

		// Obtener información de la compra
		const [compra] = await pool.execute(`
			SELECT 
				c.id,
				c.id_usuario,
				u.username,
				c.total,
				c.fecha
			FROM compras c
			JOIN usuario u ON c.id_usuario = u.id
			WHERE c.id = ?
		`, [compraId])

		if (!compra || compra.length === 0) {
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
			compra: compra[0],
			detalles: detalles
		})
	} catch (err) {
		console.error('Error getting compra details:', err)
		if (err.code && (err.code.startsWith('ER_') || err.code === 'ECONNREFUSED')) {
			return res.status(500).json({ mensaje: 'Error de conexión con la base de datos' })
		}
		res.status(500).json({ mensaje: 'Error interno del servidor al obtener detalles de compra' })
	}
})

// ADMIN: obtener ticket de una compra
app.get('/admin/ticket/:compraId', requireAdmin, async (req, res) => {
	try {
		const compraId = req.params.compraId

		// Validar ID
		if (!compraId || Number.isNaN(Number(compraId))) {
			return res.status(400).json({ mensaje: 'ID de compra inválido' })
		}

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
			WHERE t.id_compra = ?
		`, [compraId])

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
		console.error('Error getting ticket:', err)
		if (err.code && (err.code.startsWith('ER_') || err.code === 'ECONNREFUSED')) {
			return res.status(500).json({ mensaje: 'Error de conexión con la base de datos' })
		}
		res.status(500).json({ mensaje: 'Error interno del servidor al obtener ticket' })
	}
})

const port = process.env.PORT || 3000

// Manejo de errores no capturados
process.on('uncaughtException', (err) => {
    console.error('❌ Error no capturado:', err)
    console.log('🔄 El servidor continúa ejecutándose...')
})

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Promesa rechazada no manejada:', reason)
    console.log('🔄 El servidor continúa ejecutándose...')
})

// IMPORTANTE: Cambiar app.listen por server.listen para que Socket.io funcione
server.listen(port, () => {
    console.log(`🚀 Servidor en http://localhost:${port}`)
    console.log(`📁 Archivos estáticos desde: ${path.join(__dirname, 'public')}`)
    console.log(`🌐 Imágenes ahora se manejan por URL externa`)
    console.log(`🔌 Socket.io activado para ubicaciones en tiempo real`)
})

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`❌ Puerto ${port} ya está en uso`)
        console.log('💡 Intenta usar otro puerto o cerrar el proceso que lo está usando')
        process.exit(1)
    } else {
        console.error('❌ Error del servidor:', err)
    }
})

