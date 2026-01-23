import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

// --- DOM Elements for Loader ---
const loaderContainer = document.getElementById('loader-container')
const enterBtn = document.getElementById('enter-btn')

// --- Scene Setup ---
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x202020)
let mixer = null
let clock = new THREE.Clock()
let characterModel = null  // Store reference for raycasting
let characterObject = null
let mapObject = null  // Store reference for map object
let micObject = null  // Store reference for mic object
let idleAction = null
let waveAction = null

// --- Camera Setup (Isometric) ---
const aspect = window.innerWidth / window.innerHeight
const viewSize = 4.5  // Controls zoom level - smaller = more zoomed in
const camera = new THREE.OrthographicCamera(
  -viewSize * aspect, // left
  viewSize * aspect,  // right
  viewSize,           // top
  -viewSize,          // bottom
  0.1,                // near
  1000                // far
)
// Isometric angle: equal distance on all axes
camera.position.set(15, 15, 15)
camera.lookAt(1, 2, -5)  // Look at your target point

// --- Renderer Setup ---
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.shadowMap.enabled = true
document.body.appendChild(renderer.domElement)

// --- Controls ---
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

// Set the point camera orbits around (center of room)
controls.target.set(1, 1, -5)

// Lock vertical rotation to a fixed angle (horizontal only)
const fixedAngle = Math.PI * 0.35  // ~63° from top - adjust as needed
controls.minPolarAngle = fixedAngle
controls.maxPolarAngle = fixedAngle


controls.minAzimuthAngle = Math.PI / 6; // limit left rotation (e.g. -45 degrees)
controls.maxAzimuthAngle = Math.PI / 3;  // limit right rotation (e.g. 45 degrees)
// Damping for smoother rotation
controls.dampingFactor = 0.05

// Limit zoom distance
controls.minDistance = 1    // Can't zoom too close
controls.maxDistance = 6    // Can't zoom too far out (stay inside room)

// Store initial camera angle for auto-return
const initialAzimuthalAngle = controls.getAzimuthalAngle()
let isReturning = false

// Start return animation when user releases controls
controls.addEventListener('end', () => {
  isReturning = true
})

// Cancel return if user starts rotating again
controls.addEventListener('start', () => {
  isReturning = false
})

// --- Raycaster for mouse interaction ---
const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()
let isHoveringCharacter = false
let isHoveringMap = false
let isHoveringMic = false
let isMapOpen = false
let isPodcastOpen = false
let isAboutOpen = false

const tooltip = document.getElementById('character-tooltip')
const aboutPanel = document.getElementById('about-panel')
const panelClose = document.querySelector('.panel-close')

// --- DOM Elements for Map View ---
const mapView = document.getElementById('map-view')
const mapClose = document.querySelector('.map-close')
const mapLoading = document.querySelector('.map-loading')
const mapContent = document.querySelector('.map-content')
const continentPopup = document.getElementById('continent-popup')
const popupClose = document.querySelector('.popup-close')
const popupTitle = document.querySelector('.popup-title')

// --- DOM Elements for Podcast Popup ---
const podcastPopup = document.getElementById('podcast-popup')
const podcastClose = document.querySelector('.podcast-close')

// --- Zoom State ---
let isZoomedIn = false
let isZooming = false
let targetViewSize = 4.5
let currentViewSize = 4.5
const zoomedInViewSize = 2.5
const defaultViewSize = 4.5

// --- Lights ---
const ambientLight = new THREE.AmbientLight(0xffffff, 1)
scene.add(ambientLight)

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9)
directionalLight.position.set(3, 4, -1)
directionalLight.castShadow = false
scene.add(directionalLight)

const pointLight = new THREE.PointLight(0xff9000, 1, 100)
pointLight.position.set(3, 4, -1)
pointLight.castShadow = true
scene.add(pointLight)

const cubeGeometry = new THREE.BoxGeometry(1, 1, 1)
const cubeMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 })
const cube = new THREE.Mesh(cubeGeometry, cubeMaterial)
cube.position.y = 0.5
cube.castShadow = true
scene.add(cube)

// --- Model Loading ---
const loader = new GLTFLoader()
loader.load(
  '/models/room.glb',
  (gltf) => {
    console.log('Model loaded successfully')
    const model = gltf.scene

    // Adjust model if needed
    model.position.set(0, 0, 0)
    model.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true
        child.receiveShadow = true
      }
    })

    // Optional: Hide placeholder cube when model loads
    cube.visible = false

    // List all objects by name
    console.log('--- All objects in model ---')
    model.traverse((child) => {
      if (child.name) {
        console.log(child.name, child.type)
      }
    })
    console.log('----------------------------')

    // Find map object by name
    mapObject = model.getObjectByName('map')
    if (mapObject) {
      console.log('Map object found')
    } else {
      console.log('Map object not found')
    }

    // Find mic object by name
    micObject = model.getObjectByName('macbook')
    if (micObject) {
      console.log('Mic object found')
    } else {
      console.log('Mic object not found - check console for object names')
    }

    characterObject = model.getObjectByName('jingkai')
    if (characterObject) {
      console.log('Character object found')
      characterModel = characterObject  // Store reference for raycasting

      characterObject.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true
          child.receiveShadow = true
        }
      })

      // Animation Mixer
      if (gltf.animations && gltf.animations.length > 0) {
        mixer = new THREE.AnimationMixer(characterObject)

        // Log available animations and play the first one
        console.log('Available animations:', gltf.animations.map(clip => clip.name))
        const clip = gltf.animations[0]
        const action = mixer.clipAction(clip)
        action.play()
        console.log('Playing animation:', clip.name)
      }
    } else {
      console.log('Character object not found')
    }


    scene.add(model)

    // Show Enter Button
    if (enterBtn) {
      enterBtn.classList.remove('hidden')
      enterBtn.classList.add('visible')
    }
  },
  (xhr) => {
    if (xhr.total > 0) {
      const percent = (xhr.loaded / xhr.total * 100)
      console.log(percent + '% loaded')
    }
  },
  (error) => {
    console.warn('An error happened loading the model:', error)
    console.log('Please place your "room.glb" file in "public/models/"')

    // Show Enter button even on error (will show placeholder cube)
    if (enterBtn) {
      enterBtn.classList.remove('hidden')
      enterBtn.classList.add('visible')
    }
  }
)

// --- Character Loading ---
// loader.load(
//   '/models/character_wave.glb',
//   (gltf) => {
//     console.log('Character loaded successfully')
//     const character = gltf.scene
//     characterModel = character  // Store reference for raycasting
//     character.position.set(3, 0, -4) // Adjust position as needed
//     character.scale.set(1.2, 1.2, 1.2) // Adjust scale as needed

//     character.traverse((child) => {
//       if (child.isMesh) {
//         child.castShadow = true
//         child.receiveShadow = true
//       }
//     })

//     scene.add(character)

//     // Animation Mixer - store wave animation for click trigger
//     if (gltf.animations && gltf.animations.length > 0) {
//       mixer = new THREE.AnimationMixer(character)
//       waveAction = mixer.clipAction(gltf.animations[0])
//       waveAction.setLoop(THREE.LoopOnce)
//       waveAction.clampWhenFinished = true
//       // Don't auto-play - wait for click, idle will be loaded separately
//     }
//   },
//   (xhr) => {
//     console.log('Character: ' + (xhr.loaded / xhr.total * 100) + '% loaded')
//   },
//   (error) => {
//     console.warn('Character not found (optional):', error)
//   }
// )

// --- Load Idle Animation ---
loader.load(
  '/models/character_idle.glb',
  (gltf) => {
    if (gltf.animations && gltf.animations.length > 0 && mixer) {
      idleAction = mixer.clipAction(gltf.animations[0])
      idleAction.play()  // Start with idle animation
    }
  },
  undefined,
  (error) => {
    console.warn('Idle animation not found:', error)
  }
)

// --- Trigger Wave Animation ---
function triggerWaveAnimation() {
  if (!waveAction || !idleAction) return

  idleAction.fadeOut(0.3)
  waveAction.reset().fadeIn(0.3).play()

  // Return to idle after wave completes
  const duration = waveAction.getClip().duration
  setTimeout(() => {
    waveAction.fadeOut(0.5)
    idleAction.reset().fadeIn(0.5).play()
  }, (duration - 0.5) * 1000)
}

// --- Resize Handler ---
window.addEventListener('resize', () => {
  const newAspect = window.innerWidth / window.innerHeight
  camera.left = -currentViewSize * newAspect
  camera.right = currentViewSize * newAspect
  camera.top = currentViewSize
  camera.bottom = -currentViewSize
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})

// --- Enter Button Click Handler ---
if (enterBtn) {
  enterBtn.addEventListener('click', () => {
    // Fade out loader
    if (loaderContainer) {
      loaderContainer.classList.add('fade-out')
    }

    // Show canvas
    renderer.domElement.classList.add('visible')

    // Remove loader from DOM after transition
    setTimeout(() => {
      if (loaderContainer) {
        loaderContainer.style.display = 'none'
      }
    }, 800)
  })
}

// --- Mouse move for hover detection ---
window.addEventListener('mousemove', (event) => {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1

  if (!isZoomedIn) {
    raycaster.setFromCamera(mouse, camera)

    // Check character hover
    let hoveringCharacter = false
    let hoveringMap = false
    let hoveringMic = false

    if (characterModel) {
      const charIntersects = raycaster.intersectObject(characterModel, true)
      hoveringCharacter = charIntersects.length > 0
    }

    // Check map hover
    if (mapObject) {
      const mapIntersects = raycaster.intersectObject(mapObject, true)
      hoveringMap = mapIntersects.length > 0
    }

    // Check mic hover
    if (micObject) {
      const micIntersects = raycaster.intersectObject(micObject, true)
      hoveringMic = micIntersects.length > 0
    }

    isHoveringCharacter = hoveringCharacter
    isHoveringMap = hoveringMap
    isHoveringMic = hoveringMic

    if (hoveringCharacter) {
      if (tooltip) {
        tooltip.textContent = 'about me'
        tooltip.classList.remove('hidden')
        tooltip.classList.add('visible')
        tooltip.style.left = event.clientX + 'px'
        tooltip.style.top = (event.clientY - 15) + 'px'
      }
      document.body.style.cursor = 'pointer'
    } else if (hoveringMap) {
      if (tooltip) {
        tooltip.textContent = 'map'
        tooltip.classList.remove('hidden')
        tooltip.classList.add('visible')
        tooltip.style.left = event.clientX + 'px'
        tooltip.style.top = (event.clientY - 15) + 'px'
      }
      document.body.style.cursor = 'pointer'
    } else if (hoveringMic) {
      if (tooltip) {
        tooltip.textContent = 'podcast'
        tooltip.classList.remove('hidden')
        tooltip.classList.add('visible')
        tooltip.style.left = event.clientX + 'px'
        tooltip.style.top = (event.clientY - 15) + 'px'
      }
      document.body.style.cursor = 'pointer'
    } else {
      if (tooltip) {
        tooltip.classList.remove('visible')
        tooltip.classList.add('hidden')
      }
      document.body.style.cursor = 'default'
    }
  }
})

// --- Click for panel ---
window.addEventListener('click', (event) => {
  // Character click (about me)
  if (isHoveringCharacter && !isMapOpen && !isPodcastOpen && !isAboutOpen) {
    openAboutPopup()
  }

  // Map click
  if (isHoveringMap && !isMapOpen && !isPodcastOpen && !isAboutOpen) {
    openMapView()
  }

  // Mic click (podcast)
  if (isHoveringMic && !isMapOpen && !isPodcastOpen && !isAboutOpen) {
    openPodcastPopup()
  }
})

// --- Close panel ---
if (panelClose) {
  panelClose.addEventListener('click', (event) => {
    event.stopPropagation()
    closeAboutPopup()
  })
}

// --- About Popup Functions ---
function openAboutPopup() {
  isAboutOpen = true
  // Hide tooltip
  if (tooltip) {
    tooltip.classList.remove('visible')
    tooltip.classList.add('hidden')
  }
  document.body.style.cursor = 'default'

  // Show about popup
  if (aboutPanel) {
    aboutPanel.classList.add('visible')
  }
}

function closeAboutPopup() {
  isAboutOpen = false
  if (aboutPanel) {
    aboutPanel.classList.remove('visible')
  }
}

// --- Map View Functions ---
function openMapView() {
  isMapOpen = true
  // Hide tooltip
  if (tooltip) {
    tooltip.classList.remove('visible')
    tooltip.classList.add('hidden')
  }
  document.body.style.cursor = 'default'

  // Show map view with loading state
  if (mapView) {
    mapView.classList.add('visible')
  }

  // Simulate loading then show content
  setTimeout(() => {
    if (mapLoading) mapLoading.style.display = 'none'
    if (mapContent) mapContent.classList.remove('hidden')
  }, 1500)
}

function closeMapView() {
  isMapOpen = false
  // Hide popup first if open
  if (continentPopup) {
    continentPopup.classList.remove('visible')
  }
  // Hide map view
  if (mapView) {
    mapView.classList.remove('visible')
  }
  // Reset loading state for next open
  setTimeout(() => {
    if (mapLoading) mapLoading.style.display = 'flex'
    if (mapContent) mapContent.classList.add('hidden')
  }, 500)
}

// --- Map Close Button ---
if (mapClose) {
  mapClose.addEventListener('click', closeMapView)
}

// --- Continent Click Handlers ---
document.querySelectorAll('.continent').forEach(continent => {
  continent.addEventListener('click', (e) => {
    const continentName = e.target.dataset.name
    showContinentPopup(continentName)
  })
})

function showContinentPopup(continentName) {
  if (popupTitle) {
    popupTitle.textContent = continentName
  }
  if (continentPopup) {
    continentPopup.classList.add('visible')
  }
}

// --- Popup Close Button ---
if (popupClose) {
  popupClose.addEventListener('click', () => {
    if (continentPopup) {
      continentPopup.classList.remove('visible')
    }
  })
}

// --- Podcast Popup Functions ---
function openPodcastPopup() {
  isPodcastOpen = true
  // Hide tooltip
  if (tooltip) {
    tooltip.classList.remove('visible')
    tooltip.classList.add('hidden')
  }
  document.body.style.cursor = 'default'

  // Show podcast popup
  if (podcastPopup) {
    podcastPopup.classList.add('visible')
  }
}

function closePodcastPopup() {
  isPodcastOpen = false
  if (podcastPopup) {
    podcastPopup.classList.remove('visible')
  }
}

// --- Podcast Close Button ---
if (podcastClose) {
  podcastClose.addEventListener('click', closePodcastPopup)
}

// --- Escape Key Handler ---
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    // Close podcast popup first if open
    if (isPodcastOpen) {
      closePodcastPopup()
    }
    // Close continent popup if open
    else if (continentPopup && continentPopup.classList.contains('visible')) {
      continentPopup.classList.remove('visible')
    }
    // Then close map view if open
    else if (isMapOpen) {
      closeMapView()
    }
    // Then close about panel if open
    else if (isAboutOpen) {
      closeAboutPopup()
    }
  }
})

// --- Animation Loop ---
function animate() {
  requestAnimationFrame(animate)

  const delta = clock.getDelta()
  if (mixer) mixer.update(delta)

  // Smooth return to initial rotation
  if (isReturning && !isZooming) {
    const currentAngle = controls.getAzimuthalAngle()
    const targetAngle = initialAzimuthalAngle

    // Calculate shortest rotation path
    let angleDiff = targetAngle - currentAngle
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2

    // Stop when close enough
    if (Math.abs(angleDiff) < 0.001) {
      isReturning = false
    } else {
      // Smooth lerp - lower value = smoother but slower
      const lerpFactor = 1 - Math.pow(0.02, delta)
      const newAngle = currentAngle + angleDiff * lerpFactor

      // Apply rotation by updating camera position around target
      const distance = camera.position.distanceTo(controls.target)
      const polarAngle = controls.getPolarAngle()

      camera.position.x = controls.target.x + distance * Math.sin(polarAngle) * Math.sin(newAngle)
      camera.position.z = controls.target.z + distance * Math.sin(polarAngle) * Math.cos(newAngle)
    }
  }

  // Zoom animation (kept for potential future use)
  if (isZooming) {
    const zoomSpeed = 3
    const diff = targetViewSize - currentViewSize

    if (Math.abs(diff) < 0.01) {
      // Zoom complete
      currentViewSize = targetViewSize
      isZooming = false

      if (targetViewSize === zoomedInViewSize) {
        isZoomedIn = true
      }
    } else {
      // Lerp toward target
      currentViewSize += diff * zoomSpeed * delta
    }

    // Update camera
    const aspect = window.innerWidth / window.innerHeight
    camera.left = -currentViewSize * aspect
    camera.right = currentViewSize * aspect
    camera.top = currentViewSize
    camera.bottom = -currentViewSize
    camera.updateProjectionMatrix()
  }

  controls.update()
  renderer.render(scene, camera)
}

animate()
