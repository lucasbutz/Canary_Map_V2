import './style.css'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

const Seattle = [-122.3321, 47.6062]

// ─── MAP INIT ───────────────────────────────────────────────────────────────
const map = new maplibregl.Map({
  container: 'map',
  style: 'https://tiles.openfreemap.org/styles/bright',
  center: Seattle,
  zoom: 11.15
})

// ─── REPORT DATA ─────────────────────────────────────────────────────────────
// All pins live here. Add to this array and call refreshPins() to update map.
const reports = [
  {
    coordinates: [-122.3321, 47.6562],
    description: '<strong>Test Pin</strong><p>Placeholder report near Wallingford.</p>'
  },
  {
    coordinates: [-122.3121, 47.6262],
    description: '<strong>Test Pin 2</strong><p>Placeholder report near First Hill.</p>'
  },

  {
    coordinates: [-122.3021, 47.6562],
    description: '<strong>Test Pin 3</strong><p>Placeholder report near UW IMA.</p>'
  },
  {
    coordinates: [-122.3021, 47.6402],
    description: '<strong>Test Pin 4</strong><p>Placeholder report near Montlake.</p>'
  }
]

// Converts reports array to GeoJSON FeatureCollection
function buildGeoJSON(reports) {
  return {
    type: 'FeatureCollection',
    features: reports.map(r => ({
      type: 'Feature',
      properties: { description: r.description },
      geometry: { type: 'Point', coordinates: r.coordinates }
    }))
  }
}

// Pushes latest reports array to the map source
function refreshPins() {
  map.getSource('places').setData(buildGeoJSON(reports))
}

// ─── GEOCODING ───────────────────────────────────────────────────────────────
// Converts a street address string to [lng, lat] via OpenStreetMap Nominatim
// No API key required. Rate limit: 1 request/sec — fine for user-submitted reports.
async function geocodeAddress(address) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`
  const res = await fetch(url)
  const data = await res.json()
  if (!data.length) throw new Error('Address not found')
  return [parseFloat(data[0].lon), parseFloat(data[0].lat)]
}

// ─── MODAL ───────────────────────────────────────────────────────────────────
// Inject modal + button HTML into the page
document.body.insertAdjacentHTML('beforeend', `
  <!-- Report button fixed to bottom center -->
  <button id="open-report-btn">+ Report Activity</button>

  <!-- Modal overlay — hidden by default -->
  <div id="report-modal" class="modal-overlay hidden">
    <div class="modal-card">
      <button id="close-modal-btn" class="modal-close">✕</button>
      <h2>Report Activity</h2>

      <label for="report-address">Address or Intersection</label>
      <input id="report-address" type="text" placeholder="e.g. 4213 10th Ave, Seattle" />

      <label for="report-description">Description</label>
      <textarea id="report-description" rows="4" placeholder="What did you see?"></textarea>

      <p id="modal-error" class="modal-error hidden">Could not find that address. Try being more specific.</p>

      <button id="submit-report-btn" class="submit-btn">Submit</button>
    </div>
  </div>
`)

// ─── MODAL LOGIC ─────────────────────────────────────────────────────────────
const modal = document.getElementById('report-modal')
const openBtn = document.getElementById('open-report-btn')
const closeBtn = document.getElementById('close-modal-btn')
const submitBtn = document.getElementById('submit-report-btn')
const errorMsg = document.getElementById('modal-error')

openBtn.addEventListener('click', () => modal.classList.remove('hidden'))
closeBtn.addEventListener('click', () => closeModal())

// Close modal on overlay click (outside the card)
modal.addEventListener('click', (e) => {
  if (e.target === modal) closeModal()
})

function closeModal() {
  modal.classList.add('hidden')
  document.getElementById('report-address').value = ''
  document.getElementById('report-description').value = ''
  errorMsg.classList.add('hidden')
}

// ─── SUBMIT HANDLER ──────────────────────────────────────────────────────────
submitBtn.addEventListener('click', async () => {
  const address = document.getElementById('report-address').value.trim()
  const description = document.getElementById('report-description').value.trim()

  if (!address || !description) return

  submitBtn.textContent = 'Locating...'
  submitBtn.disabled = true
  errorMsg.classList.add('hidden')

  try {
    // Geocode address → coordinates
    const coords = await geocodeAddress(address)

    // Add new report to array and refresh map pins
    reports.push({
      coordinates: coords,
      description: `<strong>Report</strong><p>${description}</p>`
    })
    refreshPins()

    // Fly to new pin
    map.flyTo({ center: coords, zoom: 14 })
    closeModal()

  } catch (err) {
    errorMsg.classList.remove('hidden')
  } finally {
    submitBtn.textContent = 'Submit'
    submitBtn.disabled = false
  }
})

// ─── MAP LOAD ────────────────────────────────────────────────────────────────
map.on('load', async () => {

  // Load custom marker image
  const image = await map.loadImage('https://maplibre.org/maplibre-gl-js/docs/assets/custom_marker.png')
  map.addImage('custom-marker', image.data)

  // Add GeoJSON source — this is what refreshPins() updates
  map.addSource('places', {
    type: 'geojson',
    data: buildGeoJSON(reports)
  })

  // Add symbol layer using the custom marker image
  map.addLayer({
    id: 'places',
    type: 'symbol',
    source: 'places',
    layout: {
      'icon-image': 'custom-marker',
      'icon-overlap': 'always'
    }
  })

  // ─── POPUP ON HOVER ────────────────────────────────────────────────────────
  const popup = new maplibregl.Popup({
    closeButton: false,
    closeOnClick: false
  })

  let currentFeatureCoordinates = undefined

  map.on('mousemove', 'places', (e) => {
    const featureCoordinates = e.features[0].geometry.coordinates.toString()
    if (currentFeatureCoordinates !== featureCoordinates) {
      currentFeatureCoordinates = featureCoordinates
      map.getCanvas().style.cursor = 'pointer'
      const coordinates = e.features[0].geometry.coordinates.slice()
      const description = e.features[0].properties.description
      while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
        coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360
      }
      popup.setLngLat(coordinates).setHTML(description).addTo(map)
    }
  })

  map.on('mouseleave', 'places', () => {
    currentFeatureCoordinates = undefined
    map.getCanvas().style.cursor = ''
    popup.remove()
  })
})




///// ------------------------- STATIC VERSION --------------------------------------
// import './style.css'
// import maplibregl from 'maplibre-gl'
// import 'maplibre-gl/dist/maplibre-gl.css'

// const Seattle = [-122.3321, 47.6062]


// const map = new maplibregl.Map({
//   container: 'map',
//   style: 'https://tiles.openfreemap.org/styles/bright',
//   center: Seattle,
//   zoom: 11.15
// });

// map.on('load', async () => {
//   const image = await map.loadImage('https://maplibre.org/maplibre-gl-js/docs/assets/custom_marker.png');
//   // Add an image to use as a custom marker
//   map.addImage('custom-marker', image.data);

//   map.addSource('places', {
//       'type': 'geojson',
//       'data': {
//           'type': 'FeatureCollection',
//           'features': [
//               {
//                   'type': 'Feature',
//                   'properties': {
//                       'description':
//                           '<strong>Make it Mount Pleasant</strong><p>Make it Mount Pleasant is a handmade and vintage market and afternoon of live entertainment and kids activities. 12:00-6:00 p.m.</p>'
//                   },
//                   'geometry': {
//                       'type': 'Point',
//                       'coordinates': [-122.3321, 47.6562]
//                   }
//               },
//               {
//                   'type': 'Feature',
//                   'properties': {
//                       'description':
//                           '<strong>Mad Men Season Five Finale Watch Party</strong><p>Head to Lounge 201 (201 Massachusetts Avenue NE) Sunday for a Mad Men Season Five Finale Watch Party, complete with 60s costume contest, Mad Men trivia, and retro food and drink. 8:00-11:00 p.m. $10 general admission, $20 admission and two hour open bar.</p>'
//                   },
//                   'geometry': {
//                       'type': 'Point',
//                       'coordinates': [-122.3121, 47.6262]
//                   }
//               },
//               {
//                   'type': 'Feature',
//                   'properties': {
//                       'description':
//                           '<strong>Big Backyard Beach Bash and Wine Fest</strong><p>EatBar (2761 Washington Boulevard Arlington VA) is throwing a Big Backyard Beach Bash and Wine Fest on Saturday, serving up conch fritters, fish tacos and crab sliders, and Red Apron hot dogs. 12:00-3:00 p.m. $25.</p>'
//                   },
//                   'geometry': {
//                       'type': 'Point',
//                       'coordinates': [-122.3319, 47.6059]
//                   }
//               },
//               {
//                   'type': 'Feature',
//                   'properties': {
//                       'description':
//                           '<strong>Ballston Arts & Crafts Market</strong><p>The Ballston Arts & Crafts Market sets up shop next to the Ballston metro this Saturday for the first of five dates this summer. Nearly 35 artists and crafters will be on hand selling their wares. 10:00-4:00 p.m.</p>'
//                   },
//                   'geometry': {
//                       'type': 'Point',
//                       'coordinates': [-122.3122, 47.62]
//                   }
//               },
//               {
//                   'type': 'Feature',
//                   'properties': {
//                       'description':
//                           '<strong>Seersucker Bike Ride and Social</strong><p>Feeling dandy? Get fancy, grab your bike, and take part in this year\'s Seersucker Social bike ride from Dandies and Quaintrelles. After the ride enjoy a lawn party at Hillwood with jazz, cocktails, paper hat-making, and more. 11:00-7:00 p.m.</p>'
//                   },
//                   'geometry': {
//                       'type': 'Point',
//                       'coordinates': [-122.3321, 47.6162]
//                   }
//               },
//               {
//                   'type': 'Feature',
//                   'properties': {
//                       'description':
//                           '<strong>Capital Pride Parade</strong><p>The annual Capital Pride Parade makes its way through Dupont this Saturday. 4:30 p.m. Free.</p>'
//                   },
//                   'geometry': {
//                       'type': 'Point',
//                       'coordinates': [-122.3221, 47.6382]
//                   }
//               },
//               {
//                   'type': 'Feature',
//                   'properties': {
//                       'description':
//                           '<strong>Muhsinah</strong><p>Jazz-influenced hip hop artist Muhsinah plays the Black Cat (1811 14th Street NW) tonight with Exit Clov and Gods’illa. 9:00 p.m. $12.</p>'
//                   },
//                   'geometry': {
//                       'type': 'Point',
//                       'coordinates': [-122.3021, 47.642]
//                   }
//               },
//               {
//                   'type': 'Feature',
//                   'properties': {
//                       'description':
//                           '<strong>Truckeroo</strong><p>Truckeroo brings dozens of food trucks, live music, and games to half and M Street SE (across from Navy Yard Metro Station) today from 11:00 a.m. to 11:00 p.m.</p>'
//                   },
//                   'geometry': {
//                       'type': 'Point',
//                       'coordinates': [-122.3021, 47.612]
//                   }
//               }
//           ]
//       }
//   });

//   // Add a layer showing the places.
//   map.addLayer({
//       'id': 'places',
//       'type': 'symbol',
//       'source': 'places',
//       'layout': {
//           'icon-image': 'custom-marker',
//           'icon-overlap': 'always'
//       }
//   });

//   // Create a popup, but don't add it to the map yet.
//   const popup = new maplibregl.Popup({
//       closeButton: false,
//       closeOnClick: false
//   });

//   // Make sure to detect marker change for overlapping markers
//   // and use mousemove instead of mouseenter event
//   let currentFeatureCoordinates = undefined;
//   map.on('mousemove', 'places', (e) => {
//       const featureCoordinates = e.features[0].geometry.coordinates.toString();
//       if (currentFeatureCoordinates !== featureCoordinates) {
//           currentFeatureCoordinates = featureCoordinates;

//           // Change the cursor style as a UI indicator.
//           map.getCanvas().style.cursor = 'pointer';

//           const coordinates = e.features[0].geometry.coordinates.slice();
//           const description = e.features[0].properties.description;

//           // Ensure that if the map is zoomed out such that multiple
//           // copies of the feature are visible, the popup appears
//           // over the copy being pointed to.
//           while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
//               coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
//           }

//           // Populate the popup and set its coordinates
//           // based on the feature found.
//           popup.setLngLat(coordinates).setHTML(description).addTo(map);
//       }
//   });

//   map.on('mouseleave', 'places', () => {
//       currentFeatureCoordinates = undefined;
//       map.getCanvas().style.cursor = '';
//       popup.remove();
//   });

//   // end of map load 
// });




