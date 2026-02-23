import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

// --- DOM Elements for Loader ---
const loaderContainer = document.getElementById('loader-container')
const enterBtn = document.getElementById('enter-btn')
const welcomeOverlay = document.getElementById('welcome-overlay')

// Show motivation text during loading (staggered entrance)
setTimeout(() => {
  const loaderMotivation = document.querySelector('.loader-motivation')
  if (loaderMotivation) loaderMotivation.classList.add('visible')
}, 400)

// --- Scene Setup ---
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x202020)
let mixer = null
let clock = new THREE.Clock()
let characterModel = null  // Store reference for raycasting
let characterObject = null
let mapObject = null  // Store reference for map object
let micObject = null  // Store reference for mic object
let trophyObject = null  // Store reference for trophy object
let bubbleObject = null  // Store reference for bubble object
let birdiesObject = null  // Store reference for birdies object
let tvObject = null  // Store reference for television object
let idleAction = null
let waveAction = null
let characterHoverTimer = null

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
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.0
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

// Disable zoom
controls.enableZoom = false

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
let isHoveringTrophy = false
let isHoveringBubble = false
let isHoveringBirdies = false
let isHoveringTV = false
let isMapOpen = false
let isPodcastOpen = false
let isAboutOpen = false
let isLeaderboardOpen = false
let isReflectionOpen = false
let isTVOpen = false

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

// --- DOM Elements for Leaderboard Popup ---
const leaderboardPopup = document.getElementById('leaderboard-popup')
const leaderboardClose = document.querySelector('.leaderboard-close')

// --- DOM Elements for Reflection Popup (shared by bubble & birdies) ---
const reflectionPopup = document.getElementById('reflection-popup')
const reflectionClose = document.querySelector('.reflection-close')

// --- DOM Elements for TV Popup ---
const tvPopup = document.getElementById('tv-popup')
const tvClose = document.querySelector('.tv-close')

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

const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
directionalLight.position.set(6, 4, -1)
directionalLight.castShadow = false
scene.add(directionalLight)
directionalLight.target.position.set(4, 2, -5)
scene.add(directionalLight.target)


const pointLight = new THREE.PointLight(0xff9000, 1, 100)
pointLight.position.set(3, 4, -1)
pointLight.castShadow = true
scene.add(pointLight)

// --- Light Helpers ---
const directionalLightHelper = new THREE.DirectionalLightHelper(directionalLight, 1)
scene.add(directionalLightHelper)

const pointLightHelper = new THREE.PointLightHelper(pointLight, 0.5)
scene.add(pointLightHelper)

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

    // Find trophy object by name
    trophyObject = model.getObjectByName('trophy-base001')
    if (trophyObject) {
      console.log('Trophy object found')
    } else {
      console.log('Trophy object not found - check console for object names')
    }

    // Find bubble object by name
    bubbleObject = model.getObjectByName('bubble')
    if (bubbleObject) {
      console.log('Bubble object found')
    } else {
      console.log('Bubble object not found - check console for object names')
    }

    // Find birdies object by name
    birdiesObject = model.getObjectByName('birdies')
    if (birdiesObject) {
      console.log('Birdies object found')
    } else {
      console.log('Birdies object not found - check console for object names')
    }

    // Find television object by name
    tvObject = model.getObjectByName('television')
    if (tvObject) {
      console.log('Television object found')
    } else {
      console.log('Television object not found - check console for object names')
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
        const clip = gltf.animations[4]
        waveAction = mixer.clipAction(clip)
        waveAction.setLoop(THREE.LoopOnce)
        waveAction.clampWhenFinished = true
        // Don't auto-play — defer to enter button
        console.log('Prepared animation:', clip.name)
      }
    } else {
      console.log('Character object not found')
    }


    scene.add(model)

    // Show Enter Button
    document.querySelector('.loading-message').textContent = "let's go!"
    if (enterBtn) {
      enterBtn.classList.remove('hidden')
      enterBtn.classList.add('visible')
    }
    const loaderMotivation = document.querySelector('.loader-motivation')
    if (loaderMotivation) loaderMotivation.classList.add('visible')
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
    document.querySelector('.loading-message').textContent = "let's go!"
    if (enterBtn) {
      enterBtn.classList.remove('hidden')
      enterBtn.classList.add('visible')
    }
    const loaderMotivation = document.querySelector('.loader-motivation')
    if (loaderMotivation) loaderMotivation.classList.add('visible')
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
      // Don't auto-play — character stays static until wave is triggered
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

    // Show welcome overlay after loader is fully gone
    setTimeout(() => {
      if (welcomeOverlay) {
        welcomeOverlay.classList.add('visible')
      }
    }, 900)

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      if (welcomeOverlay) {
        welcomeOverlay.classList.add('fade-out')
        setTimeout(() => { welcomeOverlay.style.display = 'none' }, 600)
      }
    }, 5900)

    // Play wave animation 1s after entering
    setTimeout(() => {
      if (waveAction) {
        waveAction.reset().play()
      }
    }, 100)
  })
}

// Click anywhere to dismiss welcome overlay
if (welcomeOverlay) {
  welcomeOverlay.addEventListener('click', () => {
    welcomeOverlay.classList.add('fade-out')
    setTimeout(() => { welcomeOverlay.style.display = 'none' }, 600)
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
    let hoveringTrophy = false
    let hoveringBubble = false
    let hoveringBirdies = false

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

    // Check trophy hover
    if (trophyObject) {
      const trophyIntersects = raycaster.intersectObject(trophyObject, true)
      hoveringTrophy = trophyIntersects.length > 0
    }

    // Check bubble hover
    if (bubbleObject) {
      const bubbleIntersects = raycaster.intersectObject(bubbleObject, true)
      hoveringBubble = bubbleIntersects.length > 0
    }

    // Check birdies hover
    if (birdiesObject) {
      const birdiesIntersects = raycaster.intersectObject(birdiesObject, true)
      hoveringBirdies = birdiesIntersects.length > 0
    }

    // Check television hover
    let hoveringTV = false
    if (tvObject) {
      const tvIntersects = raycaster.intersectObject(tvObject, true)
      hoveringTV = tvIntersects.length > 0
    }

    // Character hover timer: replay wave after 3s of hovering
    if (hoveringCharacter && !isHoveringCharacter) {
      // Just started hovering — start 3s timer
      characterHoverTimer = setTimeout(() => {
        if (waveAction) {
          waveAction.reset().play()
        }
        characterHoverTimer = null
      }, 500)
    } else if (!hoveringCharacter && isHoveringCharacter) {
      // Stopped hovering — clear timer
      if (characterHoverTimer) {
        clearTimeout(characterHoverTimer)
        characterHoverTimer = null
      }
    }

    isHoveringCharacter = hoveringCharacter
    isHoveringMap = hoveringMap
    isHoveringMic = hoveringMic
    isHoveringTrophy = hoveringTrophy
    isHoveringBubble = hoveringBubble
    isHoveringBirdies = hoveringBirdies
    isHoveringTV = hoveringTV

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
    } else if (hoveringTrophy) {
      if (tooltip) {
        tooltip.textContent = 'film leaderboard'
        tooltip.classList.remove('hidden')
        tooltip.classList.add('visible')
        tooltip.style.left = event.clientX + 'px'
        tooltip.style.top = (event.clientY - 15) + 'px'
      }
      document.body.style.cursor = 'pointer'
    } else if (hoveringBubble) {
      if (tooltip) {
        tooltip.textContent = 'bubble'
        tooltip.classList.remove('hidden')
        tooltip.classList.add('visible')
        tooltip.style.left = event.clientX + 'px'
        tooltip.style.top = (event.clientY - 15) + 'px'
      }
      document.body.style.cursor = 'pointer'
    } else if (hoveringBirdies) {
      if (tooltip) {
        tooltip.textContent = 'birdies'
        tooltip.classList.remove('hidden')
        tooltip.classList.add('visible')
        tooltip.style.left = event.clientX + 'px'
        tooltip.style.top = (event.clientY - 15) + 'px'
      }
      document.body.style.cursor = 'pointer'
    } else if (hoveringTV) {
      if (tooltip) {
        tooltip.textContent = 'television'
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
  const anyPopupOpen = isMapOpen || isPodcastOpen || isAboutOpen || isLeaderboardOpen || isReflectionOpen || isTVOpen

  // Character click (about me)
  if (isHoveringCharacter && !anyPopupOpen) {
    openAboutPopup()
  }

  // Map click
  if (isHoveringMap && !anyPopupOpen) {
    openMapView()
  }

  // Mic click (podcast)
  if (isHoveringMic && !anyPopupOpen) {
    openPodcastPopup()
  }

  // Trophy click (film leaderboard)
  if (isHoveringTrophy && !anyPopupOpen) {
    openLeaderboardPopup()
  }

  // Bubble or Birdies click (same popup)
  if ((isHoveringBubble || isHoveringBirdies) && !anyPopupOpen) {
    openReflectionPopup()
  }

  // Television click
  if (isHoveringTV && !anyPopupOpen) {
    openTVPopup()
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

// --- Leaderboard Popup Functions ---
function openLeaderboardPopup() {
  isLeaderboardOpen = true
  // Hide tooltip
  if (tooltip) {
    tooltip.classList.remove('visible')
    tooltip.classList.add('hidden')
  }
  document.body.style.cursor = 'default'

  // Show leaderboard popup
  if (leaderboardPopup) {
    leaderboardPopup.classList.add('visible')
  }

  // Reset review panel to default state
  resetLeaderboardReview()
}

function closeLeaderboardPopup() {
  isLeaderboardOpen = false
  if (leaderboardPopup) {
    leaderboardPopup.classList.remove('visible')
  }
}

// Handle film selection for review display
function selectFilm(filmId) {
  const films = {
    1: {
      title: 'The Diplomat',
      review: "The Diplomat concisely captured the essence and challenges of diplomacy. Hal's speech, Kate's conflicts and Dennison's dilemnas articulated the challenges, consequences and trade-offs that diplomats face on a daily. It was the closest portrayal and experience I've had to experiencing policy negotiations and it is no wonder that I have completed all 3 seasons of The Diplomat."
    },
    2: {
      title: 'Joint Security Area',
      review: 'Probably the most heart-wrenching film thus far, I couldnt help but sympatise with the characters. It truly reminded me that humans are never really at war with each other, but may be forced into conflict and differences to fulfill the will of their leaders. Park Chan-wook masterfully blurs the line between enemy and friend, leaving a lasting impression.'
    },
    3: {
      title: 'The Interview',
      review: 'I never knew that I could laugh my heart out at a film about North Korea. This bold satirical comedy was surprisingly relatable with music and media that resonated with the class, yet bringing across a very clear and strong message about the stronghold that the media has over global politics. Will finish it soon!'
    }
  }

  const film = films[filmId]
  if (film) {
    const reviewTitle = document.querySelector('.review-title')
    const reviewText = document.querySelector('.review-text')
    const reviewPlaceholder = document.querySelector('.review-placeholder')

    if (reviewTitle) reviewTitle.textContent = film.title
    if (reviewText) reviewText.textContent = film.review
    if (reviewPlaceholder) reviewPlaceholder.classList.add('hidden')
    if (reviewTitle) reviewTitle.classList.remove('hidden')
    if (reviewText) reviewText.classList.remove('hidden')

    // Update active state on podium items
    document.querySelectorAll('.podium-item').forEach(item => {
      item.classList.remove('active')
    })
    document.querySelector(`[data-film-id="${filmId}"]`)?.classList.add('active')
  }
}

function resetLeaderboardReview() {
  const reviewTitle = document.querySelector('.review-title')
  const reviewText = document.querySelector('.review-text')
  const reviewPlaceholder = document.querySelector('.review-placeholder')

  if (reviewTitle) reviewTitle.classList.add('hidden')
  if (reviewText) reviewText.classList.add('hidden')
  if (reviewPlaceholder) reviewPlaceholder.classList.remove('hidden')

  document.querySelectorAll('.podium-item').forEach(item => {
    item.classList.remove('active')
  })
}

// --- Leaderboard Close Button ---
if (leaderboardClose) {
  leaderboardClose.addEventListener('click', closeLeaderboardPopup)
}

// --- Reflection Popup Functions (shared by bubble & birdies) ---
function openReflectionPopup() {
  isReflectionOpen = true
  if (tooltip) {
    tooltip.classList.remove('visible')
    tooltip.classList.add('hidden')
  }
  document.body.style.cursor = 'default'
  if (reflectionPopup) {
    reflectionPopup.classList.add('visible')
  }
}

function closeReflectionPopup() {
  isReflectionOpen = false
  if (reflectionPopup) {
    reflectionPopup.classList.remove('visible')
  }
}

if (reflectionClose) {
  reflectionClose.addEventListener('click', closeReflectionPopup)
}

// --- TV Popup Functions ---
function openTVPopup() {
  isTVOpen = true
  if (tooltip) {
    tooltip.classList.remove('visible')
    tooltip.classList.add('hidden')
  }
  document.body.style.cursor = 'default'
  if (tvPopup) {
    tvPopup.classList.add('visible')
  }
}

function closeTVPopup() {
  isTVOpen = false
  if (tvPopup) {
    tvPopup.classList.remove('visible')
  }
}

if (tvClose) {
  tvClose.addEventListener('click', closeTVPopup)
}

// --- Podium Item Click Handlers ---
document.querySelectorAll('.podium-item').forEach(item => {
  item.addEventListener('click', () => {
    const filmId = item.dataset.filmId
    selectFilm(parseInt(filmId))
  })
})

// --- Escape Key Handler ---
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    // Close TV popup if open
    if (isTVOpen) {
      closeTVPopup()
    }
    // Close reflection popup if open
    else if (isReflectionOpen) {
      closeReflectionPopup()
    }
    // Close leaderboard popup first if open
    else if (isLeaderboardOpen) {
      closeLeaderboardPopup()
    }
    // Close podcast popup if open
    else if (isPodcastOpen) {
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
    else if (isCheatsheetOpen) {
      closeCheatsheet()
    }
    else if (isAboutOpen) {
      closeAboutPopup()
    }
  }
})

// --- Cheatsheet Help Overlay ---
const helpBtn = document.getElementById('help-btn')
const cheatsheetOverlay = document.getElementById('cheatsheet-overlay')
const cheatsheetClose = document.querySelector('.cheatsheet-close')
let isCheatsheetOpen = false

function openCheatsheet() {
  cheatsheetOverlay.classList.add('visible')
  isCheatsheetOpen = true
}

function closeCheatsheet() {
  cheatsheetOverlay.classList.remove('visible')
  isCheatsheetOpen = false
}

helpBtn.addEventListener('click', () => {
  if (isCheatsheetOpen) {
    closeCheatsheet()
  } else {
    openCheatsheet()
  }
})

cheatsheetClose.addEventListener('click', closeCheatsheet)

cheatsheetOverlay.addEventListener('click', (e) => {
  if (e.target === cheatsheetOverlay) {
    closeCheatsheet()
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
