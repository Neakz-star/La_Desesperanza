console.log('🗺️ Iniciando mapa de Leaflet...');

// Verificar que el contenedor existe
const mapContainer = document.getElementById('map');
if (!mapContainer) {
    console.error('❌ No se encontró el contenedor del mapa #map');
} else {
    console.log('✅ Contenedor del mapa encontrado');
}

// Inicializar Socket.io
console.log('🔌 Conectando a Socket.io...');
const socket = io();

socket.on('connect', () => {
    console.log('✅ Socket.io conectado:', socket.id);
});

socket.on('connect_error', (error) => {
    console.error('❌ Error de conexión Socket.io:', error);
});

// Coordenadas del mapa (Naucalpan - Hacienda de Echegaray)
console.log('🗺️ Creando mapa con Leaflet...');
const map = L.map('map').setView([19.491376, -99.227719], 15);
console.log('✅ Mapa inicializado');

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    minZoom: 12,
    maxZoom: 19,
}).addTo(map);

map.locate({enableHighAccuracy:true});

// Encontrar ubicación del usuario
map.on('locationfound', e => {
    const coords = [e.latlng.lat, e.latlng.lng];
    const marker = L.marker(coords);
    marker.bindPopup('Aquí se encuentra usted');
    map.addLayer(marker);
    socket.emit('userCoordinates', coords);
});

// Marcador de la panadería
const marcador = L.marker([19.491376, -99.227719]).addTo(map);
marcador.bindPopup('<strong>La Desesperanza</strong><br>Av. Dr. Gustavo Baz 185<br>Hacienda de Echegaray');
console.log('✅ Marcador de la panadería añadido');

// Almacenar marcadores de otros usuarios
const userMarkers = {};

// Recibir ubicaciones de otros usuarios
socket.on('userNewCoordinates', (data) => {
    console.log('nuevo usuario conectado:', data);
    
    // Si ya existe un marcador para este usuario, actualizarlo
    if (userMarkers[data.id]) {
        userMarkers[data.id].setLatLng(data.coords);
    } else {
        // Crear nuevo marcador para el usuario
        const marker = L.marker(data.coords);
        marker.bindPopup(`Usuario: ${data.id.substring(0, 8)}...`);
        map.addLayer(marker);
        userMarkers[data.id] = marker;
    }
});

// Eliminar marcador cuando un usuario se desconecta
socket.on('userDisconnected', (userId) => {
    console.log('Usuario desconectado:', userId);
    if (userMarkers[userId]) {
        map.removeLayer(userMarkers[userId]);
        delete userMarkers[userId];
    }
});
