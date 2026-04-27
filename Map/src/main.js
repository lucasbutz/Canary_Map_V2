import './style.css'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

const Seattle = [-122.3321, 47.6062]

  const map = new maplibregl.Map({
    container: 'map',
    style: 'https://tiles.openfreemap.org/styles/liberty',
    center: Seattle,
    zoom: 12
  })

  map.on('load', () => {
    new maplibregl.Popup({ closeOnClick: true })
      .setLngLat(Seattle)
      .setHTML("<h3>Test Pin</h3>")
      .addTo(map)
  })





