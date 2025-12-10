(function(){
  // Modal functions
  globalThis.showLoginModal = function() {
    document.getElementById('loginModal').classList.remove('hidden');
    document.getElementById('registerModal').classList.add('hidden');
    document.body.style.overflow = 'hidden';
  }

  globalThis.showRegisterModal = function() {
    document.getElementById('registerModal').classList.remove('hidden');
    document.getElementById('loginModal').classList.add('hidden');
    document.body.style.overflow = 'hidden';
  }

  globalThis.closeModals = function() {
    document.getElementById('loginModal').classList.add('hidden');
    document.getElementById('registerModal').classList.add('hidden');
    document.body.style.overflow = 'auto';
  }

  // Función para previsualizar imagen desde URL
  globalThis.loadImagePreview = function() {
    const imageUrlInput = document.getElementById('productImageUrl')
    const previewContainer = document.getElementById('imagePreview')
    const previewImg = document.getElementById('previewImg')
    
    if (!imageUrlInput || !previewContainer || !previewImg) return
    
    const imageUrl = imageUrlInput.value.trim()
    if (!imageUrl) {
      previewContainer.classList.add('hidden')
      return
    }
    
    // Validar URL básicamente
    try {
      const url = new URL(imageUrl)
      
      // Verificar si es una URL de Google Images
      if (url.hostname.includes('google.com') && imageUrl.includes('url?sa=i')) {
        alert('⚠️ Esta es una URL de Google Images que no funcionará.\n\nPara obtener la URL correcta:\n1. Haz clic derecho en la imagen\n2. Selecciona "Copiar dirección de imagen"\n3. Pega esa URL aquí')
        return
      }
    } catch (e) {
      alert('URL inválida. Debe ser una URL completa como: https://ejemplo.com/imagen.jpg')
      return
    }
    
    // Mostrar la imagen
    previewImg.src = imageUrl
    previewImg.onload = function() {
      previewContainer.classList.remove('hidden')
      console.log('✅ Imagen cargada correctamente:', imageUrl)
    }
    previewImg.onerror = function() {
      alert('❌ No se pudo cargar la imagen desde esta URL.\n\nVerifica que:\n• Sea una URL directa de imagen\n• La imagen sea pública\n• Termine en .jpg, .png, .gif, etc.')
      previewContainer.classList.add('hidden')
    }
  }

  // Función para mostrar ejemplos de URLs de imágenes
  globalThis.showImageExamples = async function() {
    try {
      const res = await fetch('/example-images')
      const data = await res.json()
      
      let message = data.mensaje + '\n\n'
      message += 'EJEMPLOS DE URLs VÁLIDAS:\n'
      data.examples.forEach((example, index) => {
        message += `${index + 1}. ${example.name}: ${example.url}\n`
      })
      
      message += '\nINSTRUCCIONES:\n'
      data.instructions.forEach((instruction, index) => {
        message += `${index + 1}. ${instruction}\n`
      })
      
      alert(message)
    } catch (error) {
      alert('No se pudieron cargar los ejemplos. Intenta con URLs directas de imágenes como: https://ejemplo.com/imagen.jpg')
    }
  }

  // Función para mostrar/ocultar el carrito lateral (igual que en index)
  globalThis.toggleCart = function() {
    const cartSidebar = document.getElementById('cartSidebar')
    if (cartSidebar) {
      if (cartSidebar.classList.contains('translate-x-full')) {
        // Mostrar carrito
        cartSidebar.classList.remove('translate-x-full')
        cartSidebar.classList.add('translate-x-0')
        document.body.style.overflow = 'hidden'
        
        // Solo actualizar display del carrito, sin cargar productos extra
        updateCartDisplay()
      } else {
        // Ocultar carrito
        cartSidebar.classList.add('translate-x-full')
        cartSidebar.classList.remove('translate-x-0')
        document.body.style.overflow = 'auto'
      }
    }
  }

  globalThis.toggleSaldo = async function() {
    // Verificar si el usuario está logueado
    try {
      const checkRes = await fetch('/check-auth')
      const authData = await checkRes.json()
      
      if (!authData.loggedIn) {
        mostrarToast('Debes iniciar sesión para acceder a tu billetera')
        showLoginModal()
        return
      }
    } catch (error) {
      console.error('Error al verificar autenticación:', error)
      mostrarToast('Debes iniciar sesión para acceder a tu billetera')
      showLoginModal()
      return
    }

    const saldoSidebar = document.getElementById('saldoSidebar')
    if (saldoSidebar) {
      if (saldoSidebar.classList.contains('translate-x-full')) {
        // Mostrar sidebar de saldo
        saldoSidebar.classList.remove('translate-x-full')
        saldoSidebar.classList.add('translate-x-0')
        document.body.style.overflow = 'hidden'
        
        // Cargar saldo actual
        await actualizarSaldoDisplay()
      } else {
        // Ocultar sidebar de saldo
        saldoSidebar.classList.add('translate-x-full')
        saldoSidebar.classList.remove('translate-x-0')
        document.body.style.overflow = 'auto'
      }
    }
  }

  globalThis.setMontoRecarga = function(monto) {
    const input = document.getElementById('montoRecarga')
    const display = document.getElementById('montoAgregar')
    if (input && display) {
      input.value = monto
      display.textContent = `$${monto.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    }
  }

  globalThis.actualizarSaldoDisplay = async function() {
    try {
      const res = await fetch('/saldo')
      const data = await res.json()
      
      if (data.saldo !== undefined) {
        const saldoActual = document.getElementById('saldoActual')
        const saldoCounter = document.getElementById('saldoCounter')
        
        if (saldoActual) {
          saldoActual.textContent = `$${parseFloat(data.saldo).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        }
        if (saldoCounter) {
          saldoCounter.textContent = `$${parseFloat(data.saldo).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        }
      }
    } catch (error) {
      console.error('Error al obtener saldo:', error)
    }
  }

  globalThis.agregarSaldo = async function() {
    const input = document.getElementById('montoRecarga')
    const monto = parseFloat(input.value)
    
    if (!monto || monto <= 0) {
      mostrarToast('Por favor ingresa un monto válido mayor a 0')
      return
    }
    
    if (monto > 999999999999) {
      mostrarToast('El monto excede el límite máximo')
      return
    }
    
    try {
      const res = await fetch('/saldo/agregar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monto })
      })
      
      const data = await res.json()
      
      if (data.success) {
        mostrarToast(`¡Saldo agregado! +$${parseFloat(data.montoAgregado).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} • Nuevo saldo: $${parseFloat(data.nuevoSaldo).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 4000)
        
        // Actualizar displays
        await actualizarSaldoDisplay()
        
        // Limpiar input
        input.value = ''
        const display = document.getElementById('montoAgregar')
        if (display) {
          display.textContent = '$0.00'
        }
      } else {
        mostrarToast('Error: ' + data.message)
      }
    } catch (error) {
      console.error('Error al agregar saldo:', error)
      mostrarToast('Error al agregar saldo. Por favor intenta de nuevo.')
    }
  }

  // Función legacy para compatibilidad
  globalThis.showCart = function() {
    toggleCart()
  }

  // Función legacy para compatibilidad
  globalThis.closeCart = function() {
    const cartSidebar = document.getElementById('cartSidebar')
    if (cartSidebar && !cartSidebar.classList.contains('translate-x-full')) {
      toggleCart()
    }
  }

  // Función para manejar pestañas del admin (ya no se usa, pero mantenemos compatibilidad)
  globalThis.showTab = function(tabName) {
    // Las pestañas fueron eliminadas, pero mantenemos la función por compatibilidad
    console.log('showTab function is deprecated. Using fixed sections now.')
    
    // Si alguien intenta abrir el carrito, mostrar el modal
    if (tabName === 'carrito') {
      showCart()
    }
  }

  // Cart state para admin
  let adminCart = { items: [], total: 0 }

  // Función para cargar productos disponibles en el carrito
  globalThis.loadAvailableProducts = async function() {
    const container = document.getElementById('availableProducts')
    if (!container) return
    
    container.innerHTML = '<p class="text-center text-gray-500 py-4">Cargando productos...</p>'
    
    try {
      const res = await fetch('/productos')
      if (!res.ok) {
        container.innerHTML = '<p class="text-center text-red-500">Error al cargar productos</p>'
        return
      }
      
      const products = await res.json()
      if (!products || products.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-500">No hay productos disponibles</p>'
        return
      }
      
      container.innerHTML = ''
      products.forEach(product => {
        const productDiv = document.createElement('div')
        productDiv.className = 'bg-bread-100 p-4 rounded-lg flex items-center justify-between'
        productDiv.innerHTML = `
          <div class="flex items-center">
            <img src="${product.img || 'https://via.placeholder.com/60'}" alt="${product.nombre}" class="w-12 h-12 rounded object-cover mr-3" onerror="this.src='https://via.placeholder.com/60'">
            <div>
              <h4 class="font-medium text-bread-700">${product.nombre}</h4>
              <p class="text-sm text-bread-600">$${Number(product.precio).toFixed(2)} MXN</p>
              <p class="text-xs text-gray-500">Stock: ${product.stock}</p>
            </div>
          </div>
          <button onclick="addToAdminCart(${product.id}, '${escapeHtml(product.nombre)}', ${product.precio})" 
                  class="bg-bread-500 text-white px-3 py-1 rounded hover:bg-bread-600 transition-colors">
            <i class="fas fa-plus"></i>
          </button>
        `
        container.appendChild(productDiv)
      })
    } catch (error) {
      console.error('Error loading products:', error)
      container.innerHTML = '<p class="text-center text-red-500">Error al cargar productos</p>'
    }
  }

  // Función para agregar productos al carrito del admin
  globalThis.addToAdminCart = function(id, nombre, precio) {
    const existingItem = adminCart.items.find(item => item.id === id)
    
    if (existingItem) {
      existingItem.quantity += 1
    } else {
      adminCart.items.push({
        id: id,
        name: nombre,
        price: precio,
        quantity: 1
      })
    }
    
    updateCartDisplay()
    mostrarToast(`${nombre} agregado al carrito`)
  }

  // Función para actualizar la vista del carrito (simplificada como en index)
  globalThis.updateCartDisplay = function() {
    const cartContainer = document.getElementById('cartItems')
    const cartTotal = document.getElementById('cartTotal')
    const cartCounter = document.getElementById('cartCounter')
    
    if (!cartContainer) return
    
    // Actualizar contador en la navegación (igual que en index)
    const totalItems = adminCart.items.reduce((sum, item) => sum + item.quantity, 0)
    if (cartCounter) {
      cartCounter.textContent = totalItems
      // El contador siempre está visible como en el index
    }
    
    if (adminCart.items.length === 0) {
      cartContainer.innerHTML = ''
      if (cartTotal) cartTotal.textContent = '$0.00 MXN'
      return
    }
    
    let total = 0
    cartContainer.innerHTML = ''
    
    adminCart.items.forEach((item, index) => {
      const itemTotal = item.price * item.quantity
      total += itemTotal
      
      const itemDiv = document.createElement('div')
      itemDiv.className = 'flex items-center justify-between bg-gray-50 p-3 rounded'
      itemDiv.innerHTML = `
        <div>
          <h5 class="font-medium text-bread-700">${item.name}</h5>
          <p class="text-sm text-gray-600">$${Number(item.price).toFixed(2)} × ${item.quantity} = $${itemTotal.toFixed(2)} MXN</p>
        </div>
        <button onclick="removeFromCart(${index})" class="text-red-500 hover:text-red-700">
          <i class="fas fa-trash"></i>
        </button>
      `
      cartContainer.appendChild(itemDiv)
    })
    
    if (cartTotal) cartTotal.textContent = `$${total.toFixed(2)} MXN`
    
    adminCart.total = total
  }

  // Función para actualizar cantidad en el carrito
  globalThis.updateCartQuantity = function(index, newQuantity) {
    if (newQuantity <= 0) {
      adminCart.items.splice(index, 1)
    } else {
      adminCart.items[index].quantity = newQuantity
    }
    updateCartDisplay()
  }

  // Función para remover del carrito
  globalThis.removeFromCart = function(index) {
    adminCart.items.splice(index, 1)
    updateCartDisplay()
  }

  // Función para vaciar el carrito
  globalThis.clearCart = function() {
    if (adminCart.items.length === 0) return
    
    if (confirm('¿Estás seguro de que quieres vaciar el carrito?')) {
      adminCart.items = []
      adminCart.total = 0
      updateCartDisplay()
      mostrarToast('Carrito vaciado')
    }
  }

  // Función checkout para el admin (igual que index)
  globalThis.checkout = function() {
    if (adminCart.items.length === 0) {
      alert('Tu carrito está vacío')
      return
    }
    
    // Usar la lógica del processCart
    processCart()
  }

  // Función para procesar la compra
  globalThis.processCart = async function() {
    if (adminCart.items.length === 0) {
      alert('El carrito está vacío')
      return
    }
    
    if (!confirm(`¿Confirmar compra por $${adminCart.total.toFixed(2)} MXN?`)) {
      return
    }
    
    try {
      const res = await fetch('/carrito/comprar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: adminCart.items,
          total: adminCart.total
        })
      })
      
      if (!res.ok) {
        const error = await res.json()
        alert(error.mensaje || 'Error al procesar la compra')
        return
      }
      
      const data = await res.json()
      
      // Mostrar notificación con información del saldo
      if (data.saldoDescontado && data.nuevoSaldo) {
        mostrarToast(`¡Compra exitosa! -$${parseFloat(data.saldoDescontado).toLocaleString('es-MX', { minimumFractionDigits: 2 })} • Nuevo saldo: $${parseFloat(data.nuevoSaldo).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 4000)
      } else {
        mostrarToast('Compra realizada exitosamente')
      }
      
      // Actualizar saldo en la UI
      try { await actualizarSaldoDisplay() } catch(e) { console.debug('Error actualizando saldo:', e) }
      
      // Limpiar carrito
      adminCart.items = []
      adminCart.total = 0
      updateCartDisplay()
      
      // Recargar productos disponibles para actualizar stock
      loadAvailableProducts()
      
      // Si estamos en la pestaña de productos, recargar también
      if (typeof loadAdminProducts === 'function') {
        loadAdminProducts()
      }
      
      // Actualizar historial de compras automáticamente
      if (typeof loadUserPurchases === 'function') {
        loadUserPurchases()
      }
      
    } catch (error) {
      console.error('Error processing purchase:', error)
      alert('Error al procesar la compra')
    }
  }

  // Función para cargar compras del usuario
  globalThis.loadUserPurchases = async function() {
    const tbody = document.getElementById('userPurchasesTbody')
    if (!tbody) return
    
    tbody.innerHTML = '<tr><td colspan="4" class="py-6 text-center text-bread-600">Cargando compras...</td></tr>'
    
    try {
      const res = await fetch('/carrito/historial')
      if (!res.ok) {
        if (res.status === 401) {
          tbody.innerHTML = '<tr><td colspan="4" class="py-6 text-center text-red-500">Debes iniciar sesión</td></tr>'
        } else {
          tbody.innerHTML = '<tr><td colspan="4" class="py-6 text-center text-red-500">Error al cargar compras</td></tr>'
        }
        return
      }
      
      const purchases = await res.json()
      if (!purchases || purchases.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="py-6 text-center text-gray-500">No tienes compras realizadas</td></tr>'
        return
      }
      
      tbody.innerHTML = ''
      purchases.forEach(purchase => {
        const tr = document.createElement('tr')
        tr.className = 'border-b border-gray-100'
        tr.innerHTML = `
          <td class="py-3 px-4 text-bread-700">${new Date(purchase.fecha).toLocaleDateString()}</td>
          <td class="py-3 px-4 text-bread-700">${purchase.total_productos} productos</td>
          <td class="py-3 px-4 text-bread-700">$${Number(purchase.total).toFixed(2)} MXN</td>
          <td class="py-3 px-4 text-right">
            <button onclick="showPurchaseDetails(${purchase.id})" class="bg-bread-500 text-white px-3 py-1 rounded hover:bg-bread-600 transition-colors">
              Ver Detalles
            </button>
          </td>
        `
        tbody.appendChild(tr)
      })
    } catch (error) {
      console.error('Error loading user purchases:', error)
      tbody.innerHTML = '<tr><td colspan="4" class="py-6 text-center text-red-500">Error al cargar compras</td></tr>'
    }
  }

  // Función para cargar todas las compras (admin)
  globalThis.loadAllPurchases = async function() {
    const tbody = document.getElementById('allPurchasesTbody')
    if (!tbody) return
    
    tbody.innerHTML = '<tr><td colspan="6" class="py-6 text-center text-bread-600">Cargando compras...</td></tr>'
    
    try {
      const res = await fetch('/admin/compras')
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          tbody.innerHTML = '<tr><td colspan="6" class="py-6 text-center text-red-500">No autorizado</td></tr>'
        } else {
          tbody.innerHTML = '<tr><td colspan="6" class="py-6 text-center text-red-500">Error al cargar compras</td></tr>'
        }
        return
      }
      
      const purchases = await res.json()
      if (!purchases || purchases.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="py-6 text-center text-gray-500">No hay compras registradas</td></tr>'
        return
      }
      
      tbody.innerHTML = ''
      purchases.forEach(purchase => {
        const tr = document.createElement('tr')
        tr.className = 'border-b border-gray-100'
        tr.innerHTML = `
          <td class="py-3 px-4 text-bread-700">#${purchase.id}</td>
          <td class="py-3 px-4 text-bread-700">${purchase.username}</td>
          <td class="py-3 px-4 text-bread-700">${new Date(purchase.fecha).toLocaleDateString()}</td>
          <td class="py-3 px-4 text-bread-700">${purchase.total_productos} productos</td>
          <td class="py-3 px-4 text-bread-700">$${Number(purchase.total).toFixed(2)} MXN</td>
          <td class="py-3 px-4 text-right">
            <button onclick="showPurchaseDetailsAdmin(${purchase.id})" class="bg-bread-500 text-white px-3 py-1 rounded hover:bg-bread-600 transition-colors">
              Ver Detalles
            </button>
          </td>
        `
        tbody.appendChild(tr)
      })
    } catch (error) {
      console.error('Error loading all purchases:', error)
      tbody.innerHTML = '<tr><td colspan="6" class="py-6 text-center text-red-500">Error al cargar compras</td></tr>'
    }
  }

  // Función para mostrar detalles de compra (usuario)
  globalThis.showPurchaseDetails = async function(purchaseId) {
    try {
      const res = await fetch(`/carrito/compra/${purchaseId}`)
      if (!res.ok) {
        alert('Error al cargar detalles de la compra')
        return
      }
      
      const data = await res.json()
      showPurchaseDetailModal(data)
    } catch (error) {
      console.error('Error loading purchase details:', error)
      alert('Error al cargar detalles de la compra')
    }
  }

  // Función para mostrar detalles de compra (admin)
  globalThis.showPurchaseDetailsAdmin = async function(purchaseId) {
    try {
      const res = await fetch(`/admin/compras/${purchaseId}`)
      if (!res.ok) {
        alert('Error al cargar detalles de la compra')
        return
      }
      
      const data = await res.json()
      showPurchaseDetailModal(data)
    } catch (error) {
      console.error('Error loading purchase details:', error)
      alert('Error al cargar detalles de la compra')
    }
  }

  // Función para mostrar el modal de detalles
  function showPurchaseDetailModal(data) {
    const modal = document.getElementById('purchaseDetailModal')
    const content = document.getElementById('purchaseDetailContent')
    
    if (!modal || !content) return
    
    let html = `
      <div class="mb-6">
        <h3 class="text-lg font-medium text-bread-700 mb-2">Información de la Compra</h3>
        <div class="bg-gray-50 p-4 rounded">
          <p><strong>ID:</strong> #${data.compra.id}</p>
          ${data.compra.username ? `<p><strong>Usuario:</strong> ${data.compra.username}</p>` : ''}
          <p><strong>Fecha:</strong> ${new Date(data.compra.fecha).toLocaleDateString()}</p>
          <p><strong>Total:</strong> $${Number(data.compra.total).toFixed(2)} MXN</p>
        </div>
      </div>
      
      <div>
        <h3 class="text-lg font-medium text-bread-700 mb-2">Productos Comprados</h3>
        <div class="space-y-2">
    `
    
    data.detalles.forEach(item => {
      html += `
        <div class="bg-gray-50 p-3 rounded flex justify-between items-center">
          <div>
            <p class="font-medium">${item.nombre}</p>
            <p class="text-sm text-gray-600">$${Number(item.precio).toFixed(2)} × ${item.cantidad}</p>
          </div>
          <p class="font-medium">$${Number(item.subtotal).toFixed(2)} MXN</p>
        </div>
      `
    })
    
    html += '</div></div>'
    content.innerHTML = html
    modal.classList.remove('hidden')
    document.body.style.overflow = 'hidden'
  }

  // Función para cerrar el modal de detalles
  globalThis.closePurchaseDetailModal = function() {
    const modal = document.getElementById('purchaseDetailModal')
    if (modal) {
      modal.classList.add('hidden')
      document.body.style.overflow = 'auto'
    }
  }

  // Función para cerrar el modal de detalles en la página pública
  globalThis.closePurchaseDetailModalPublic = function() {
    const modal = document.getElementById('purchaseDetailModalPublic')
    if (modal) {
      modal.classList.add('hidden')
      document.body.style.overflow = 'auto'
    }
  }

  // Agregar funcionalidad para cerrar modales haciendo clic fuera del contenido
  document.addEventListener('DOMContentLoaded', function() {
    // Modal para detalles de compra (admin)
    const purchaseModal = document.getElementById('purchaseDetailModal')
    if (purchaseModal) {
      purchaseModal.addEventListener('click', function(e) {
        if (e.target === purchaseModal) {
          closePurchaseDetailModal()
        }
      })
    }

    // Modal para detalles de compra (público)
    const purchaseModalPublic = document.getElementById('purchaseDetailModalPublic')
    if (purchaseModalPublic) {
      purchaseModalPublic.addEventListener('click', function(e) {
        if (e.target === purchaseModalPublic) {
          closePurchaseDetailModalPublic()
        }
      })
    }

    // También agregar escape key para cerrar modales
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        if (purchaseModal && !purchaseModal.classList.contains('hidden')) {
          closePurchaseDetailModal()
        }
        if (purchaseModalPublic && !purchaseModalPublic.classList.contains('hidden')) {
          closePurchaseDetailModalPublic()
        }
      }
    })

    // Event listener para actualizar el monto de recarga
    const montoRecargaInput = document.getElementById('montoRecarga')
    if (montoRecargaInput) {
      montoRecargaInput.addEventListener('input', function() {
        const display = document.getElementById('montoAgregar')
        const monto = parseFloat(this.value)
        if (display) {
          if (monto && monto > 0) {
            display.textContent = `$${monto.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          } else {
            display.textContent = '$0.00'
          }
        }
      })
    }

    // Actualizar saldo al cargar la página si el usuario está logueado
    actualizarSaldoDisplay()
  })

  // Funciones específicas para la página pública (index.html)
  
  // Función para cargar compras del usuario en la página pública
  globalThis.loadUserPurchasesPublic = async function() {
    const tbody = document.getElementById('userPurchasesTbodyPublic')
    if (!tbody) return
    
    tbody.innerHTML = '<tr><td colspan="4" class="py-6 text-center text-bread-600">Cargando compras...</td></tr>'
    
    try {
      const res = await fetch('/carrito/historial')
      if (!res.ok) {
        if (res.status === 401) {
          tbody.innerHTML = '<tr><td colspan="4" class="py-6 text-center text-red-500">Debes iniciar sesión para ver tus compras</td></tr>'
        } else {
          tbody.innerHTML = '<tr><td colspan="4" class="py-6 text-center text-red-500">Error al cargar compras</td></tr>'
        }
        return
      }
      
      const purchases = await res.json()
      if (!purchases || purchases.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="py-6 text-center text-gray-500">No tienes compras realizadas</td></tr>'
        return
      }
      
      tbody.innerHTML = ''
      purchases.forEach(purchase => {
        const tr = document.createElement('tr')
        tr.className = 'border-b border-gray-100'
        tr.innerHTML = `
          <td class="py-3 px-4 text-bread-700">${new Date(purchase.fecha).toLocaleDateString()}</td>
          <td class="py-3 px-4 text-bread-700">${purchase.total_productos} productos</td>
          <td class="py-3 px-4 text-bread-700">$${Number(purchase.total).toFixed(2)} MXN</td>
          <td class="py-3 px-4 text-right">
            <button onclick="showPurchaseDetailsPublic(${purchase.id})" class="bg-bread-500 text-white px-3 py-1 rounded hover:bg-bread-600 transition-colors">
              Ver Detalles
            </button>
          </td>
        `
        tbody.appendChild(tr)
      })
    } catch (error) {
      console.error('Error loading user purchases:', error)
      tbody.innerHTML = '<tr><td colspan="5" class="py-6 text-center text-red-500">Error al cargar compras</td></tr>'
    }
  }

  // Función para mostrar detalles de compra en la página pública
  globalThis.showPurchaseDetailsPublic = async function(purchaseId) {
    try {
      const res = await fetch(`/carrito/compra/${purchaseId}`)
      if (!res.ok) {
        alert('Error al cargar detalles de la compra')
        return
      }
      
      const data = await res.json()
      showPurchaseDetailModalPublic(data)
    } catch (error) {
      console.error('Error loading purchase details:', error)
      alert('Error al cargar detalles de la compra')
    }
  }

  // Función para mostrar el modal de detalles en la página pública
  function showPurchaseDetailModalPublic(data) {
    const modal = document.getElementById('purchaseDetailModalPublic')
    const content = document.getElementById('purchaseDetailContentPublic')
    
    if (!modal || !content) return
    
    let html = `
      <div class="mb-6">
        <h3 class="text-lg font-medium text-bread-700 mb-2">Información de la Compra</h3>
        <div class="bg-gray-50 p-4 rounded">
          <p><strong>ID:</strong> #${data.compra.id}</p>
          <p><strong>Fecha:</strong> ${new Date(data.compra.fecha).toLocaleDateString()}</p>
          <p><strong>Total:</strong> $${Number(data.compra.total).toFixed(2)} MXN</p>
        </div>
      </div>
      
      <div>
        <h3 class="text-lg font-medium text-bread-700 mb-2">Productos Comprados</h3>
        <div class="space-y-2">
    `
    
    data.detalles.forEach(item => {
      html += `
        <div class="bg-gray-50 p-3 rounded flex justify-between items-center">
          <div>
            <p class="font-medium">${item.nombre}</p>
            <p class="text-sm text-gray-600">$${Number(item.precio).toFixed(2)} × ${item.cantidad}</p>
          </div>
          <p class="font-medium">$${Number(item.subtotal).toFixed(2)} MXN</p>
        </div>
      `
    })
    
    html += '</div></div>'
    content.innerHTML = html
    modal.classList.remove('hidden')
    document.body.style.overflow = 'hidden'
  }

  // Función para verificar si el usuario está logueado
  function checkUserLoggedIn() {
    const userInfo = document.getElementById('userInfo')
    return userInfo && !userInfo.classList.contains('hidden')
  }

  // Función para mostrar/ocultar elementos según el estado de login
  function updateNavigationVisibility() {
    const userPurchasesLink = document.querySelector('a[onclick="showUserPurchases()"]')
    if (userPurchasesLink) {
      if (checkUserLoggedIn()) {
        userPurchasesLink.classList.remove('hidden')
      } else {
        userPurchasesLink.classList.add('hidden')
      }
    }
  }

  // Event listener cuando se actualiza el estado de login
  const originalShowUserInfo = globalThis.showUserInfo
  globalThis.showUserInfo = function() {
    if (originalShowUserInfo) {
      originalShowUserInfo()
    }
    updateNavigationVisibility()
  }

  const originalLogout = globalThis.logout
  globalThis.logout = function() {
    if (originalLogout) {
      originalLogout()
    }
    updateNavigationVisibility()
  }

  // Llamar a la función de actualización al cargar la página
  document.addEventListener('DOMContentLoaded', updateNavigationVisibility)

  // Cart state
  const cartKey = 'panaderia_cart_v1'
  let cart = { items: [], total: 0 }

  // Load cart from localStorage
  try {
    const raw = localStorage.getItem(cartKey)
    if (raw) cart = JSON.parse(raw)
  } catch (e) { console.warn('No se pudo leer el carrito:', e) }

  // --- Utilidades pequeñas en español ---
  // Estas funciones ayudan a reducir repetición en el código cliente.
  // peticionJSON: envoltorio de fetch que devuelve JSON o lanza un Error con mensaje
  function peticionJSON(url, opts) {
    return fetch(url, opts).then(async function(res) {
      if (!res.ok) {
        // Intentamos leer un cuerpo JSON con mensaje de error si existe
        const err = await res.json().catch(function(){ return { mensaje: 'Error en la petición' } })
        const e = new Error(err.mensaje || 'Error en la petición')
        e.response = res
        throw e
      }
      return res.json()
    })
  }

  // Toast notification function
  globalThis.mostrarToast = function(message, duration = 3000) {
    try {
      const t = document.createElement('div')
      t.textContent = message
      t.style.position = 'fixed'
      t.style.right = '16px'
      t.style.top = '16px'
      t.style.background = '#8B5E34'
      t.style.color = 'white'
      t.style.padding = '10px 14px'
      t.style.borderRadius = '8px'
      t.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'
      t.style.zIndex = 9999
      document.body.appendChild(t)
      setTimeout(()=>{ t.style.transition = 'opacity 300ms'; t.style.opacity = '0' }, duration - 300)
      setTimeout(()=>{ try { t.remove() } catch(e){} }, duration)
    } catch(e){ console.debug('toast error', e) }
  }

  // Helper functions for modals
  function abrirModalPorId(id) {
    const m = document.getElementById(id)
    if (!m) return
    m.classList.remove('hidden')
    document.body.style.overflow = 'hidden'
  }
  
  function cerrarModalPorId(id) {
    const m = document.getElementById(id)
    if (!m) return
    m.classList.add('hidden')
    document.body.style.overflow = 'auto'
  }

    globalThis.toggleCart = function() {
      const sidebar = document.getElementById('cartSidebar')
      if (!sidebar) return
      const isOpen = !sidebar.classList.contains('translate-x-full')
      if (isOpen) {
        sidebar.classList.add('translate-x-full')
        document.body.style.overflow = 'auto'
      } else {
        sidebar.classList.remove('translate-x-full')
        document.body.style.overflow = 'hidden'
        updateCartDisplay()
      }
    }

    globalThis.addToCart = function(a, b, c, d) {
      let id = null, name, price, image
      if (typeof a === 'number' || (typeof a === 'string' && /^\d+$/.test(a))) {
        id = Number(a)
        name = b
        price = c
        image = d
      } else {
        name = a
        price = b
        image = c
      }
      const existingItem = cart.items.find(i => i.name === name)
      if (existingItem) existingItem.quantity += 1
      else cart.items.push({ id: id || null, name, price, image, quantity: 1 })
      try { globalThis.mostrarToast('Producto agregado al carrito') } catch(e) { console.debug('toast error', e) }
      persistCart()
      updateCartTotal(); updateCartCount(); updateCartDisplay()
      const sidebar = document.getElementById('cartSidebar')
      if (sidebar) sidebar.classList.remove('translate-x-full')
    }

    globalThis.removeFromCart = function(name) {
      cart.items = cart.items.filter(i => i.name !== name)
      persistCart(); updateCartTotal(); updateCartCount(); updateCartDisplay()
    }

    globalThis.updateQuantity = function(name, delta) {
      const item = cart.items.find(i => i.name === name)
      if (!item) return
      item.quantity = Math.max(0, item.quantity + delta)
      if (item.quantity === 0) removeFromCart(name)
      else { persistCart(); updateCartTotal(); updateCartCount(); updateCartDisplay() }
    }

    function updateCartTotal(){
      cart.total = cart.items.reduce((s,i)=> s + (i.price * i.quantity), 0)
      const el = document.getElementById('cartTotal')
      if (el) el.textContent = '$' + cart.total.toFixed(2) + ' MXN'
    }

    function updateCartCount(){
      const count = cart.items.reduce((s,i)=> s + i.quantity, 0)
      const el = document.querySelector('#cartCounter')
      if (el) el.textContent = count
    }

    function updateCartDisplay(){
      const cartItems = document.getElementById('cartItems')
      if (!cartItems) return
      cartItems.innerHTML = ''
      for (const item of cart.items) {
        const itemElement = document.createElement('div')
        itemElement.className = 'flex items-center space-x-4 p-4 bg-bread-100 rounded-lg'
        itemElement.innerHTML = `
          <img src="${item.image}" alt="${item.name}" class="w-20 h-20 object-cover rounded">
          <div class="flex-1">
            <h3 class="text-bread-700 font-medium">${item.name}</h3>
            <p class="text-bread-600">$${item.price.toFixed(2)} MXN</p>
            <div class="flex items-center space-x-2 mt-2">
              <button class="text-bread-500 hover:text-bread-700" data-action="dec">-</button>
              <span class="text-bread-700">${item.quantity}</span>
              <button class="text-bread-500 hover:text-bread-700" data-action="inc">+</button>
            </div>
          </div>
          <button class="text-bread-500 hover:text-bread-700" data-action="remove">🗑</button>
        `
        itemElement.querySelector('[data-action="dec"]').addEventListener('click', ()=> globalThis.updateQuantity(item.name, -1))
        itemElement.querySelector('[data-action="inc"]').addEventListener('click', ()=> globalThis.updateQuantity(item.name, 1))
        itemElement.querySelector('[data-action="remove"]').addEventListener('click', ()=> globalThis.removeFromCart(item.name))
        cartItems.appendChild(itemElement)
      }
    }

    function persistCart(){
      try { localStorage.setItem(cartKey, JSON.stringify(cart)) } catch(e){ console.warn(e) }
    }

    globalThis.checkout = function(){
      if (cart.items.length === 0) { alert('Tu carrito está vacío'); return }
      (async function(){
        try {
          const payload = { items: cart.items.map(i => ({ id: i.id || null, price: i.price, quantity: i.quantity, name: i.name })), total: cart.total }
          const res = await fetch('/carrito/comprar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
          if (res.status === 401) {
            showLoginModal()
            return
          }
          if (!res.ok) {
            const err = await res.json().catch(()=>({ mensaje: 'Error al procesar la compra' }))
            alert(err.mensaje || 'Error al procesar la compra')
            return
          }
          const data = await res.json()
          cart = { items: [], total: 0 }
          persistCart(); updateCartTotal(); updateCartCount(); updateCartDisplay()
          
          // Mostrar notificación con información del saldo
          if (data.saldoDescontado && data.nuevoSaldo) {
            try { 
              globalThis.mostrarToast(`¡Compra exitosa! -$${parseFloat(data.saldoDescontado).toLocaleString('es-MX', { minimumFractionDigits: 2 })} • Nuevo saldo: $${parseFloat(data.nuevoSaldo).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 4000)
            } catch(e){}
          } else {
            try { globalThis.mostrarToast(data.mensaje || 'Compra realizada correctamente') } catch(e){}
          }
          
          // Actualizar saldo en la UI
          try { await actualizarSaldoDisplay() } catch(e) { console.debug('Error actualizando saldo:', e) }
          
          // Actualizar historial de compras automáticamente
          if (typeof loadUserPurchasesPublic === 'function') {
            setTimeout(() => loadUserPurchasesPublic(), 500) // Pequeño delay para asegurar que la BD se actualice
          }
          
        } catch (err) {
          console.error('Checkout error', err)
          alert('Error al conectar con el servidor')
        }
      })()
    }

    function showLoginModal(){
      cerrarModalPorId('registerModal')
      abrirModalPorId('loginModal')
    }
    function showRegisterModal(){
      cerrarModalPorId('loginModal')
      abrirModalPorId('registerModal')
    }
    function closeModals(){
      cerrarModalPorId('loginModal')
      cerrarModalPorId('registerModal')
    }

    globalThis.showLoginModal = showLoginModal
    globalThis.showRegisterModal = showRegisterModal
    globalThis.closeModals = closeModals

    function onReady(cb) {
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', cb)
      else cb()
    }

    onReady(function(){
      const loginModal = document.getElementById('loginModal')
      const registerModal = document.getElementById('registerModal')
      if (loginModal) loginModal.addEventListener('click', function(e){ if (e.target === this) closeModals() })
      if (registerModal) registerModal.addEventListener('click', function(e){ if (e.target === this) closeModals() })

      function updateUserUI(user) {
        const loginBtn = document.getElementById('loginBtn')
        if (user?.admin) {
          let rightNav = null
          const navContainer = document.querySelector('nav .container') || document.querySelector('nav')
          if (navContainer) {
            const divs = navContainer.querySelectorAll('div')
            for (const d of divs) {
              if (d.querySelector('#loginBtn') || d.querySelector('#logoutBtn') || d.querySelector('#cartCounter')) {
                rightNav = d
                break
              }
            }
            if (!rightNav) rightNav = navContainer.querySelector('div')
          }
          const onAdminPath = globalThis.location && (globalThis.location.pathname === '/admin' || globalThis.location.pathname === '/admin/')
          if (onAdminPath) {
            if (rightNav) {
              const existingAdmin = rightNav.querySelector('a[href="/admin"]')
              if (existingAdmin) existingAdmin.remove()
            }
          } else {
            if (rightNav && !rightNav.querySelector('a[href="/admin"]')) {
              const a = document.createElement('a')
              a.href = '/admin'
              a.className = 'text-bread-600 hover:text-bread-700 text-sm uppercase tracking-wider'
              a.textContent = 'Admin'
              rightNav.appendChild(a)
            }
          }
        }

        if (!loginBtn) return

        if (!user) {
          loginBtn.classList.remove('relative')
          loginBtn.innerHTML = '<i class="fas fa-user mr-2"></i>Iniciar Sesión'
          loginBtn.setAttribute('onclick', 'showLoginModal()')
          const existingMenu = document.getElementById('userMenu')
          if (existingMenu) existingMenu.remove()
          delete loginBtn.dataset.userListenerAttached
          return
        }

        const displayName = user.username || user.usuario || 'Cuenta'
        loginBtn.classList.add('relative')
        loginBtn.removeAttribute('onclick')
        loginBtn.type = 'button'
        loginBtn.innerHTML = '<span class="flex items-center space-x-2"><i class="fas fa-user"></i><span class="ml-2">' + displayName + '</span></span>'

        let menu = document.getElementById('userMenu')
        if (!menu) {
          menu = document.createElement('div')
          menu.id = 'userMenu'
          menu.className = 'absolute right-0 mt-2 w-40 bg-white border rounded shadow z-50 hidden'
          menu.innerHTML = '<button id="logoutBtnNav" class="w-full text-left px-4 py-2 text-bread-700 hover:bg-bread-100 hover:text-bread-700">Cerrar sesión</button>'
          loginBtn.appendChild(menu)
        }

        if (!loginBtn.dataset.userListenerAttached) {
          loginBtn.addEventListener('click', function(e){
            e.stopPropagation()
            menu.classList.toggle('hidden')
          })
          loginBtn.dataset.userListenerAttached = '1'
        }

        const logoutBtnNav = document.getElementById('logoutBtnNav')
        if (logoutBtnNav && !logoutBtnNav.dataset.navAttached) {
          logoutBtnNav.addEventListener('click', async function(ev){
            ev.stopPropagation()
            try {
              await doLogoutFlow()
            } catch(err) { console.error('logout error', err); alert('Error al cerrar sesión') }
          })
          logoutBtnNav.dataset.navAttached = '1'
        }

        if (!document.body.dataset.userDocCloseAttached) {
          document.addEventListener('click', function docClose() {
            const menuEl = document.getElementById('userMenu')
            if (menuEl && !menuEl.classList.contains('hidden')) menuEl.classList.add('hidden')
          })
          document.body.dataset.userDocCloseAttached = '1'
        }
        
        // Actualizar visibilidad de navegación después de login
        updateNavigationVisibility()
      }

      const loginForm = document.getElementById('loginForm')
      if (loginForm) loginForm.addEventListener('submit', async function(e){
        e.preventDefault()
        const username = document.getElementById('loginUsername').value
        const password = document.getElementById('loginPassword').value
        
        // Validación del lado del cliente
        if (typeof window.validarLogin === 'function') {
          const errores = window.validarLogin(username, password)
          if (errores.length > 0) {
            alert('Errores de validación:\n• ' + errores.join('\n• '))
            return
          }
        }
        
        try {
          const res = await fetch('/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ username, password }) })
          if (!res.ok) { const err = await res.json().catch(()=>({mensaje:'Error en login'})); alert(err.mensaje || 'Usuario o contraseña incorrecta'); return }
          const data = await res.json()
          closeModals()
          try { updateUserUI(data) } catch(e){ console.debug('updateUI error', e) }
          try { actualizarSaldoDisplay() } catch(e){ console.debug('saldo update error', e) }
          try { globalThis.mostrarToast('Has iniciado sesión correctamente') } catch(e){}
          if (data.admin) {
            try { localStorage.setItem('sessionNotice', 'Has iniciado sesión correctamente') } catch(e){}
            globalThis.location.href = '/admin'
          }
        } catch(err){ console.error(err); alert('Error al conectar con el servidor') }
      })

      const registerForm = document.getElementById('registerForm')
      if (registerForm) registerForm.addEventListener('submit', async function(e){
        e.preventDefault()
        const username = document.getElementById('registerUsername').value
        const password = document.getElementById('registerPassword').value
        const confirmPassword = document.getElementById('confirmPassword').value
        
        // Validación del lado del cliente
        if (typeof window.validarRegistro === 'function') {
          const errores = window.validarRegistro(username, password, confirmPassword)
          if (errores.length > 0) {
            alert('Errores de validación:\n• ' + errores.join('\n• '))
            return
          }
        } else {
          // Fallback si validacion.js no está cargado
          if (password !== confirmPassword) { alert('Las contraseñas no coinciden'); return }
        }
        
        try {
          const res = await fetch('/register', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ username, password }) })
          const data = await res.json()
          if (!res.ok) { alert(data.mensaje || 'Error al registrar'); return }
          const loginRes = await fetch('/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ username, password }) })
          if (!loginRes.ok) {
            const err = await loginRes.json().catch(()=>({mensaje:'Error al iniciar sesión tras registro'}))
            alert(err.mensaje || 'Registro hecho, pero no se pudo iniciar sesión automáticamente')
            showLoginModal()
            return
          }
          const loginData = await loginRes.json()
          closeModals()
          try { updateUserUI(loginData) } catch(e){ console.debug('updateUserUI error', e) }
          try { globalThis.mostrarToast('Registro e inicio de sesión correctos') } catch(e){}
          if (loginData.admin) {
            try { localStorage.setItem('sessionNotice', 'Registro e inicio de sesión correctos') } catch(e){}
            globalThis.location.href = '/admin'
          } else {
            try { if (data && data.mensaje) globalThis.mostrarToast(data.mensaje) } catch(e){}
          }
        } catch(err){ console.error(err); alert('Error al conectar con el servidor') }
      })

      // Check user session on page load
      async function checkUserSession() {
        const maxRetries = 5
        let attempt = 0
        while (attempt < maxRetries) {
          try {
            const user = await peticionJSON('/perfil')
            if (user) { 
              try { updateUserUI(user) } catch(e){ console.debug('updateUserUI error', e) }
              break
            }
          } catch (e) { console.debug('perfil check error', e) }
          attempt++
          await new Promise(function(r){ setTimeout(r, 250) })
        }
      }
      checkUserSession()

      // Alias showToast to mostrarToast
      if (!globalThis.showToast) globalThis.showToast = globalThis.mostrarToast

      try {
        const sn = localStorage.getItem('sessionNotice')
        if (sn) {
          showToast(sn)
          localStorage.removeItem('sessionNotice')
        }
      } catch(e) { console.debug('sessionNotice error', e) }

      async function doLogoutFlow(ev) {
        if (ev && ev.preventDefault) ev.preventDefault()
        try {
          const res = await fetch('/logout', { method: 'POST' })
          if (!res.ok) throw new Error('Logout failed')
          try { localStorage.setItem('sessionNotice', 'Se cerró sesión correctamente') } catch(e) {}
          
          // Actualizar visibilidad de navegación antes de redirigir
          updateNavigationVisibility()
          
          globalThis.location.href = '/index.html'
        } catch(err){ console.error(err); alert('Error al cerrar sesión') }
      }

      const logoutBtn = document.getElementById('logoutBtn')
      if (logoutBtn) {
        logoutBtn.removeAttribute('onclick')
        logoutBtn.type = 'button'
        logoutBtn.addEventListener('click', doLogoutFlow)
      }

      const logoutBtnNav = document.getElementById('logoutBtnNav')
      if (logoutBtnNav && !logoutBtnNav.dataset.attached) {
        logoutBtnNav.addEventListener('click', doLogoutFlow)
        logoutBtnNav.dataset.attached = '1'
      }

      const btn = document.querySelector('button[onclick="toggleModal()"]')
      if (btn) btn.setAttribute('onclick', 'showLoginModal()')

      document.addEventListener('click', function(e){
        const t = e.target.closest('button[data-toggle-target]')
        if (!t) return
        e.preventDefault()
        const targetId = t.dataset.toggleTarget
        const input = document.getElementById(targetId)
        if (!input) return
        if (input.type === 'password') {
          input.type = 'text'
          t.innerHTML = '<i class="fas fa-eye-slash"></i>'
        } else {
          input.type = 'password'
          t.innerHTML = '<i class="fas fa-eye"></i>'
        }
      })

      updateCartTotal(); updateCartCount(); updateCartDisplay()
    
      async function loadAdminUsers() {
        const tbody = document.getElementById('adminUsersTbody')
        if (!tbody) return
        tbody.innerHTML = '<tr><td colspan="4" class="py-6 text-center text-bread-600">Cargando usuarios...</td></tr>'
        try {
          const res = await fetch('/admin/users')
          if (!res.ok) {
            tbody.innerHTML = '<tr><td colspan="4" class="py-6 text-center text-red-500">No autorizado o error</td></tr>'
            return
          }
          const users = await res.json()
          if (!Array.isArray(users) || users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="py-6 text-center text-bread-600">No hay usuarios</td></tr>'
            return
          }
          tbody.innerHTML = ''
          for (const u of users) {
            const tr = document.createElement('tr')
            tr.className = 'border-b border-gray-100'
            const adminBadge = u.admin
              ? '<span class="px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm">Activo</span>'
              : '<span class="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">Usuario</span>'
            tr.innerHTML = `
              <td class="py-3 px-4 text-bread-700">${u.id}</td>
              <td class="py-3 px-4 text-bread-700">${u.username}</td>
              <td class="py-3 px-4">${adminBadge}</td>
              <td class="py-3 px-4 text-right">
                <div class="flex justify-end items-center space-x-2">
                  <button data-action="toggle-admin" data-id="${u.id}" class="px-3 py-1 border rounded text-sm">${u.admin ? 'Quitar admin' : 'Hacer admin'}</button>
                  <button data-action="delete-user" data-id="${u.id}" class="px-3 py-1 border rounded text-sm text-red-500">Eliminar</button>
                </div>
              </td>
            `
            tbody.appendChild(tr)
          }
        } catch (err) {
          console.error('Error cargando usuarios:', err)
          tbody.innerHTML = '<tr><td colspan="4" class="py-6 text-center text-red-500">Error al cargar usuarios</td></tr>'
        }
      }

      document.addEventListener('click', async function(e){
        const btn = e.target.closest('button[data-action]')
        if (!btn) return
        const action = btn.dataset.action
        const id = btn.dataset.id
        if (!action || !id) return
        if (action === 'toggle-admin') {
          if (!confirm('Cambiar rol admin de este usuario?')) return
          try {
            const res = await fetch(`/admin/users/${id}/toggle-admin`, { method: 'POST' })
            if (!res.ok) throw new Error('Error toggling')
            await loadAdminUsers()
          } catch (err) { console.error(err); alert('Error al cambiar rol') }
        }
        if (action === 'delete-user') {
          if (!confirm('Eliminar usuario permanentemente?')) return
          try {
            const res = await fetch(`/admin/users/${id}`, { method: 'DELETE' })
            if (!res.ok) throw new Error('Error deleting')
            await loadAdminUsers()
          } catch (err) { console.error(err); alert('Error al eliminar usuario') }
        }
      })

      const refreshBtn = document.getElementById('refreshUsersBtn')
      if (refreshBtn) refreshBtn.addEventListener('click', loadAdminUsers)

      loadAdminUsers()
      if (typeof loadPublicProducts === 'function') loadPublicProducts()
      if (typeof loadAdminProducts === 'function') loadAdminProducts()
      
      // Agregar funcionalidad de vista previa de imagen desde URL
      const imageUrlInput = document.getElementById('productImageUrl')
      if (imageUrlInput) {
        imageUrlInput.addEventListener('blur', function() {
          loadImagePreview()
        })
        imageUrlInput.addEventListener('keypress', function(e) {
          if (e.key === 'Enter') {
            e.preventDefault()
            loadImagePreview()
          }
        })
      }
    })

    async function loadPublicProducts() {
      const container = document.getElementById('productos')
      if (!container) return
      container.innerHTML = '<div class="container mx-auto px-6 text-center py-12">Cargando productos...</div>'
      try {
        const res = await fetch('/productos/por-temporada')
        if (!res.ok) { container.innerHTML = '<div class="text-center text-red-500">Error al cargar productos</div>'; return }
        const grouped = await res.json()
        
        // Reordenar para mostrar primero las temporadas y luego General
        const seasons = Object.keys(grouped)
        const orderedSeasons = []
        
        // Primero añadir todas las temporadas excepto 'General'
        seasons.forEach(season => {
          if (season !== 'General') {
            orderedSeasons.push(season)
          }
        })
        
        // Luego añadir 'General' al final
        if (seasons.includes('General')) {
          orderedSeasons.push('General')
        }
        
        let html = '<div class="container mx-auto px-6">'
        html += '<h2 class="text-4xl font-light text-center text-bread-700 mb-16">Productos Selectos</h2>'
        for (const season of orderedSeasons) {
          html += `<h3 class="text-2xl font-medium text-bread-700 mb-6">${season}</h3>`
          html += '<div class="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">'
          for (const p of grouped[season]) {
            const img = p.img || 'https://via.placeholder.com/400'
            const stockBadge = p.stock <= 5 && p.stock > 0 ? `<span class="text-xs text-orange-600">¡Últimas ${p.stock} unidades!</span>` : ''
            html += `
                  <div class="bg-bread-100 p-8 rounded-xl group hover:shadow-xl transition-all duration-300">
                    <div class="relative overflow-hidden rounded-lg mb-6">
                      <img src="${img}" alt="${p.nombre}" onerror="this.onerror=null;this.src='https://via.placeholder.com/400'" class="w-full h-64 object-cover transform hover:scale-105 transition-transform duration-300">
                    </div>
                    <h3 class="text-xl font-light text-bread-700">${p.nombre}</h3>
                    <p class="text-bread-600 mt-2">${p.descripcion || ''}</p>
                    ${stockBadge ? `<p class="mt-1">${stockBadge}</p>` : ''}
                    <div class="flex justify-between items-center mt-6">
                      <p class="text-bread-700 font-medium">$${Number(p.precio).toFixed(2)} MXN</p>
                      <button onclick="addToCart(${p.id}, '${escapeHtml(p.nombre)}', ${Number(p.precio)}, '${escapeHtml(img)}')" class="bg-bread-500 text-white p-2 rounded-full hover:bg-bread-600 transform hover:scale-110 transition-all duration-300"><i class="fas fa-plus"></i></button>
                    </div>
                  </div>
                `
          }
          html += '</div>'
        }
        html += '</div>'
        container.innerHTML = html
      } catch (err) {
        console.error('Error loading productos:', err)
        container.innerHTML = '<div class="text-center text-red-500">Error al cargar productos</div>'
      }
    }

    function escapeHtml(s) {
      if (!s) return ''
      return String(s).replace(/'/g, "\\'").replace(/\"/g, '\\"')
    }

    async function loadAdminProducts() {
      const tbody = document.getElementById('adminProductsTbody')
      if (!tbody) return
      tbody.innerHTML = '<tr><td colspan="5" class="py-6 text-center text-bread-600">Cargando productos...</td></tr>'
      try {
        const res = await fetch('/admin/productos')
        if (!res.ok) { tbody.innerHTML = '<tr><td colspan="5" class="py-6 text-center text-red-500">No autorizado o error</td></tr>'; return }
        const products = await res.json()
        if (!Array.isArray(products) || products.length === 0) {
          tbody.innerHTML = '<tr><td colspan="5" class="py-6 text-center text-bread-600">No hay productos</td></tr>'
          return
        }
        tbody.innerHTML = ''
        for (const p of products) {
          const tr = document.createElement('tr')
          tr.className = 'border-b border-gray-100'
          tr.innerHTML = `
            <td class="py-3 px-4">
              <div class="flex items-center">
                <img src="${p.img || 'https://via.placeholder.com/80'}" alt="${p.nombre}" class="w-10 h-10 rounded object-cover mr-3" onerror="this.src='https://via.placeholder.com/80'">
                <div>
                  <p class="text-bread-700">${p.nombre}</p>
                  <p class="text-sm text-bread-600">${p.descripcion || ''}</p>
                </div>
              </div>
            </td>
            <td class="py-3 px-4 text-bread-700">$${Number(p.precio).toFixed(2)} MXN</td>
            <td class="py-3 px-4 text-bread-700">${p.stock || 0}</td>
            <td class="py-3 px-4">${p.activo ? '<span class="px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm">Activo</span>' : '<span class="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">Inactivo</span>'}</td>
            <td class="py-3 px-4 text-right">
              <div class="flex justify-end space-x-2">
                <button data-action="toggle-active" data-id="${p.id}" class="px-3 py-1 ${p.activo ? 'bg-gray-200 text-gray-700' : 'bg-green-200 text-green-700'} rounded text-sm hover:opacity-80">
                  ${p.activo ? 'Desactivar' : 'Activar'}
                </button>
                <button data-action="edit-product" data-id="${p.id}" class="px-3 py-1 border rounded text-sm hover:bg-bread-100">Editar</button>
                <button data-action="delete-product" data-id="${p.id}" class="px-3 py-1 border rounded text-sm text-red-500 hover:bg-red-50">Eliminar</button>
              </div>
            </td>
          `
          tbody.appendChild(tr)
        }
      } catch (err) {
        console.error('Error cargando productos admin:', err)
        tbody.innerHTML = '<tr><td colspan="5" class="py-6 text-center text-red-500">Error al cargar productos</td></tr>'
      }
    }

    globalThis.showAddProductModal = function(){
      const m = document.getElementById('addProductModal')
      if (!m) return
      
      // Si no es edición, requerir imagen
      const form = document.getElementById('addProductForm')
      const imageInput = document.getElementById('productImage')
      const editNote = document.getElementById('imageEditNote')
      
      if (form && !form.dataset.editId && imageInput) {
        imageInput.setAttribute('required', 'required')
      }
      
      // Limpiar vista previa y ocultar nota si no es edición
      if (form && !form.dataset.editId) {
        const preview = document.getElementById('imagePreview')
        if (preview) preview.classList.add('hidden')
        if (editNote) editNote.style.display = 'none'
      }
      
      m.classList.remove('hidden')
      document.body.style.overflow = 'hidden'
    }
    globalThis.closeAddProductModal = function(){
      const m = document.getElementById('addProductModal')
      if (!m) return
      
      // Limpiar el formulario y datos de edición
      const form = document.getElementById('addProductForm')
      if (form) {
        form.reset()
        delete form.dataset.editId
        
        // Restaurar el requerimiento de imagen URL
        const imageUrlInput = document.getElementById('productImageUrl')
        if (imageUrlInput) imageUrlInput.setAttribute('required', 'required')
        
        // Ocultar vista previa
        const preview = document.getElementById('imagePreview')
        if (preview) preview.classList.add('hidden')
      }
      
      m.classList.add('hidden')
      document.body.style.overflow = 'auto'
    }

    const addProductForm = document.getElementById('addProductForm')
    if (addProductForm) addProductForm.addEventListener('submit', async function(e){
      e.preventDefault()
      
      const editId = addProductForm.dataset.editId
      const name = document.getElementById('productName').value.trim()
      const description = document.getElementById('productDescription').value.trim()
      const priceInput = document.getElementById('productPrice').value
      const stockInput = document.getElementById('productStock').value
      const imageUrl = document.getElementById('productImageUrl').value.trim()
      const season = document.getElementById('productSeason') ? document.getElementById('productSeason').value.trim() : null

      // Validaciones usando el archivo validacion.js
      if (typeof validarFormularioProducto === 'function') {
        const errores = validarFormularioProducto(name, priceInput, stockInput, imageUrl)
        if (errores.length > 0) {
          alert('Errores de validación:\n\n' + errores.join('\n'))
          return
        }
      }

      // Validación adicional de números negativos
      const price = Number.parseFloat(priceInput)
      if (price < 0) {
        alert('El precio no puede ser negativo')
        return
      }

      // Validación de stock (debe ser entero positivo)
      const stock = stockInput ? Number.parseInt(stockInput, 10) : 0
      if (stockInput && (!Number.isInteger(stock) || stock < 0)) {
        alert('El stock debe ser un número entero positivo (sin decimales)')
        return
      }

      try {
        let finalImageUrl = null
        
        // Si hay una URL de imagen nueva, validarla
        if (imageUrl) {
          console.log('Validando URL de imagen:', imageUrl)
          
          // Validar que sea una URL válida básicamente en el frontend
          try {
            new URL(imageUrl)
          } catch (e) {
            alert('La URL de imagen no es válida. Debe ser una URL completa (ej: https://ejemplo.com/imagen.jpg)')
            return
          }
          
          // Validar con el servidor
          const validateRes = await fetch('/validate-image-url', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageUrl }),
            credentials: 'same-origin'
          })
          
          console.log('Respuesta de validación:', validateRes.status, validateRes.statusText)
          
          if (!validateRes.ok) {
            const err = await validateRes.json().catch(() => ({ mensaje: 'Error validando URL de imagen' }))
            console.error('Error en la validación:', err)
            alert(err.mensaje || 'Error validando URL de imagen')
            return
          }
          
          const validateData = await validateRes.json()
          console.log('URL de imagen validada exitosamente:', validateData)
          finalImageUrl = imageUrl
        } else if (editId) {
          // Si es edición y no hay imagen nueva, obtener la imagen actual
          try {
            const res = await fetch('/admin/productos')
            if (res.ok) {
              const products = await res.json()
              const currentProduct = products.find(p => String(p.id) === String(editId))
              if (currentProduct) {
                finalImageUrl = currentProduct.img
              }
            }
          } catch (e) {
            console.warn('No se pudo obtener la imagen actual del producto')
          }
        }
        
        const payload = { 
          nombre: name, 
          descripcion: description, 
          tipo: '', 
          precio: price,
          stock: stock || 0,
          img: finalImageUrl, 
          temporada: season || null, 
          activo: 1 
        }
        
        if (editId) {
          const res = await fetch(`/admin/productos/${editId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
          if (!res.ok) { const err = await res.json().catch(()=>({ mensaje: 'Error actualizando' })); alert(err.mensaje || 'Error actualizando'); return }
          delete addProductForm.dataset.editId
          closeAddProductModal()
          showToast('Producto actualizado')
          loadAdminProducts()
          // Actualizar también la vista pública si existe
          if (typeof loadPublicProducts === 'function') loadPublicProducts()
        } else {
          const res = await fetch('/admin/productos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
          if (!res.ok) {
            const err = await res.json().catch(()=>({ mensaje: 'Error creando producto' }))
            alert(err.mensaje || 'Error creando producto')
            return
          }
          closeAddProductModal()
          showToast('Producto creado')
          addProductForm.reset()
          // Limpiar vista previa de imagen
          const preview = document.getElementById('imagePreview')
          if (preview) preview.classList.add('hidden')
          loadAdminProducts()
          // Actualizar también la vista pública si existe
          if (typeof loadPublicProducts === 'function') loadPublicProducts()
        }
      } catch (err) {
        console.error('Error al crear/actualizar producto:', err)
    let message = 'Error al crear/actualizar producto'
    if (err && err.message) message = err.message
    else if (typeof err === 'string') message = err
    alert('Error al crear/actualizar producto: ' + message)
      }
    })

    document.addEventListener('click', async function(e){
      const btn = e.target.closest('button[data-action]')
      if (!btn) return
      const action = btn.dataset.action
      const id = btn.dataset.id
      if (!action || !id) return
      
      if (action === 'toggle-active') {
        try {
          const res = await fetch(`/admin/productos/${id}/toggle-active`, { method: 'POST' })
          if (!res.ok) throw new Error('Error toggling active')
          const data = await res.json()
          showToast(data.activo ? 'Producto activado' : 'Producto desactivado')
          await loadAdminProducts()
          // Actualizar también la vista pública si existe
          if (typeof loadPublicProducts === 'function') await loadPublicProducts()
        } catch (err) { console.error(err); alert('Error al cambiar estado del producto') }
      }
      
      if (action === 'delete-product') {
        if (!confirm('Eliminar producto permanentemente?')) return
        try {
          const res = await fetch(`/admin/productos/${id}`, { method: 'DELETE' })
          if (!res.ok) throw new Error('Error deleting')
          showToast('Producto eliminado')
          await loadAdminProducts()
          // Actualizar también la vista pública si existe
          if (typeof loadPublicProducts === 'function') await loadPublicProducts()
        } catch (err) { console.error(err); alert('Error al eliminar producto') }
      }
      
      if (action === 'edit-product') {
        try {
          const res = await fetch(`/admin/productos`)
          if (!res.ok) throw new Error('Error cargando productos')
          const products = await res.json()
          const p = products.find(x=>String(x.id)===String(id))
          if (!p) { alert('Producto no encontrado'); return }
          document.getElementById('productName').value = p.nombre || ''
          document.getElementById('productDescription').value = p.descripcion || ''
          document.getElementById('productPrice').value = p.precio || 0
          document.getElementById('productStock').value = p.stock || 0
          
          // Para edición, no requerir imagen nueva ya que puede usar la existente
          const imageUrlInput = document.getElementById('productImageUrl')
          if (imageUrlInput) {
            imageUrlInput.removeAttribute('required')
            // Cargar la URL actual de la imagen si existe
            if (p.img) {
              imageUrlInput.value = p.img
            }
          }
          
          // Mostrar imagen actual si existe
          const preview = document.getElementById('imagePreview')
          const previewImg = document.getElementById('previewImg')
          if (p.img && preview && previewImg) {
            previewImg.src = p.img
            preview.classList.remove('hidden')
          }
          
          const seasonEl = document.getElementById('productSeason')
          if (seasonEl) seasonEl.value = p.temporada || ''
          addProductForm.dataset.editId = id
          showAddProductModal()
        } catch(err){ console.error(err); alert('Error al editar producto') }
      }
    })

    // Event listener para cargar compras cuando se accede a la sección
    document.addEventListener('DOMContentLoaded', function() {
      // Cerrar carrito al hacer clic fuera del sidebar
      document.addEventListener('click', function(e) {
        const cartSidebar = document.getElementById('cartSidebar')
        const cartButton = e.target.closest('button[onclick*="toggleCart"]')
        
        if (cartSidebar && !cartSidebar.classList.contains('translate-x-full') && 
            !cartSidebar.contains(e.target) && !cartButton) {
          toggleCart()
        }
      })
      
      // Detectar cuando se hace clic en "Mis Compras" y cargar automáticamente
      const comprasLink = document.querySelector('a[href="#mis-compras"]')
      if (comprasLink) {
        comprasLink.addEventListener('click', function() {
          setTimeout(() => {
            loadUserPurchasesPublic()
          }, 100)
        })
      }
      
      // Si estamos en la página de admin, cargar las compras automáticamente
      if (document.getElementById('comprasSection')) {
        // Pequeño delay para asegurar que el DOM está listo
        setTimeout(() => {
          loadUserPurchases()
          loadAllPurchases()
        }, 500)
      }
    })
})();
