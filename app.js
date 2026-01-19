/**
 * Sistema de Contadores de Días sin Incidentes
 * Aplicación ligera y eficiente para gestionar múltiples contadores de tiempo
 */

// Clave para LocalStorage
const STORAGE_KEY = 'counters_app_data';
const VIEW_MODE_KEY = 'counters_view_mode';

// Estado global de la aplicación
let counters = [];
let updateInterval = null;
const TIME_UNITS = [
  { key: 'years', label: 'AÑOS', minDigits: 2 },
  { key: 'months', label: 'MESES', minDigits: 2 },
  { key: 'days', label: 'DÍAS', minDigits: 2 },
  { key: 'hours', label: 'HORAS', minDigits: 2 },
  { key: 'minutes', label: 'MINUTOS', minDigits: 2 },
  { key: 'seconds', label: 'SEGUNDOS', minDigits: 2 }
];

/**
 * Obtiene los contadores desde LocalStorage
 */
function loadCounters() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      counters = JSON.parse(stored);
    } else {
      counters = [];
    }
  } catch (error) {
    console.error('Error al cargar contadores:', error);
    counters = [];
  }
}

/**
 * Guarda los contadores en LocalStorage
 */
function saveCounters() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(counters));
  } catch (error) {
    console.error('Error al guardar contadores:', error);
    alert('Error al guardar los datos. Verifica que el almacenamiento local esté disponible.');
  }
}

function setViewMode(mode) {
  const normalized = mode === 'calculator' || mode === 'bolder' ? mode : 'flip';
  document.body.classList.toggle('view-calculator', normalized === 'calculator');
  document.body.classList.toggle('view-bolder', normalized === 'bolder');
  document.body.classList.toggle('view-flip', normalized === 'flip');
  try {
    localStorage.setItem(VIEW_MODE_KEY, normalized);
  } catch (error) {
    console.error('Error al guardar el modo de vista:', error);
  }
}

function loadViewMode() {
  try {
    const stored = localStorage.getItem(VIEW_MODE_KEY);
    return stored === 'calculator' || stored === 'bolder' ? stored : 'flip';
  } catch (error) {
    console.error('Error al cargar el modo de vista:', error);
    return 'flip';
  }
}

/**
 * Calcula el tiempo transcurrido desde una fecha
 * @param {string} startDate - Fecha de inicio en formato ISO
 * @returns {Object} Objeto con días, horas, minutos y segundos
 */
function calculateElapsedTime(startDate) {
  const start = new Date(startDate);
  const now = new Date();

  if (now < start) {
    return { years: 0, months: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  const startYear = start.getFullYear();
  const startMonth = start.getMonth();
  const startDay = start.getDate();
  const startHours = start.getHours();
  const startMinutes = start.getMinutes();
  const startSeconds = start.getSeconds();
  const startMilliseconds = start.getMilliseconds();

  let years = now.getFullYear() - startYear;
  let months = now.getMonth() - startMonth;

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  const buildClampedDate = (year, month) => {
    const lastDay = new Date(year, month + 1, 0).getDate();
    const day = Math.min(startDay, lastDay);
    return new Date(
      year,
      month,
      day,
      startHours,
      startMinutes,
      startSeconds,
      startMilliseconds
    );
  };

  let anchor = buildClampedDate(startYear + years, startMonth + months);
  while (anchor > now) {
    months -= 1;
    if (months < 0) {
      years -= 1;
      months = 11;
    }
    anchor = buildClampedDate(startYear + years, startMonth + months);
  }

  const diffMs = now - anchor;
  let totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  totalSeconds -= days * 86400;
  const hours = Math.floor(totalSeconds / 3600);
  totalSeconds -= hours * 3600;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds - minutes * 60;

  return { years, months, days, hours, minutes, seconds };
}

function formatUnitValue(value, minDigits) {
  return String(value).padStart(minDigits, '0');
}

function createFlipUnit({ key, label, minDigits }) {
  const unitEl = document.createElement('div');
  unitEl.className = 'flip-unit';
  unitEl.dataset.unit = key;
  unitEl.dataset.digits = String(minDigits);

  const labelEl = document.createElement('span');
  labelEl.className = 'flip-label';
  labelEl.textContent = label;

  const cardEl = document.createElement('div');
  cardEl.className = 'flip-card';
  cardEl.dataset.value = '0'.repeat(minDigits);

  const topEl = document.createElement('span');
  topEl.className = 'flip-card__top';
  const topDigit = document.createElement('span');
  topDigit.className = 'flip-card__digit';
  topDigit.textContent = cardEl.dataset.value;
  topEl.appendChild(topDigit);

  const bottomEl = document.createElement('span');
  bottomEl.className = 'flip-card__bottom';
  const bottomDigit = document.createElement('span');
  bottomDigit.className = 'flip-card__digit';
  bottomDigit.textContent = cardEl.dataset.value;
  bottomEl.appendChild(bottomDigit);

  const flipEl = document.createElement('span');
  flipEl.className = 'flip-card__flip';

  const flipTop = document.createElement('span');
  flipTop.className = 'flip-card__flip-top';
  const flipTopDigit = document.createElement('span');
  flipTopDigit.className = 'flip-card__digit';
  flipTopDigit.textContent = cardEl.dataset.value;
  flipTop.appendChild(flipTopDigit);

  const flipBottom = document.createElement('span');
  flipBottom.className = 'flip-card__flip-bottom';
  const flipBottomDigit = document.createElement('span');
  flipBottomDigit.className = 'flip-card__digit';
  flipBottomDigit.textContent = cardEl.dataset.value;
  flipBottom.appendChild(flipBottomDigit);

  flipEl.appendChild(flipTop);
  flipEl.appendChild(flipBottom);
  cardEl.appendChild(topEl);
  cardEl.appendChild(bottomEl);
  cardEl.appendChild(flipEl);
  unitEl.appendChild(labelEl);
  unitEl.appendChild(cardEl);

  return unitEl;
}

function buildFlipClock(timeEl) {
  const grid = document.createElement('div');
  grid.className = 'flip-grid';
  TIME_UNITS.forEach(unit => {
    grid.appendChild(createFlipUnit(unit));
  });
  timeEl.appendChild(grid);
}

function updateFlipCard(cardEl, nextValue) {
  const currentValue = cardEl.dataset.value;

  if (!cardEl.dataset.initialized) {
    cardEl.dataset.value = nextValue;
    cardEl.dataset.initialized = 'true';
    cardEl.querySelector('.flip-card__top .flip-card__digit').textContent = nextValue;
    cardEl.querySelector('.flip-card__bottom .flip-card__digit').textContent = nextValue;
    cardEl.querySelector('.flip-card__flip-top .flip-card__digit').textContent = nextValue;
    cardEl.querySelector('.flip-card__flip-bottom .flip-card__digit').textContent = nextValue;
    return;
  }

  if (currentValue === nextValue) {
    return;
  }

  if (document.body.classList.contains('view-calculator') || document.body.classList.contains('view-bolder')) {
    cardEl.classList.remove('is-flipping');
    cardEl.dataset.value = nextValue;
    cardEl.querySelector('.flip-card__top .flip-card__digit').textContent = nextValue;
    cardEl.querySelector('.flip-card__bottom .flip-card__digit').textContent = nextValue;
    cardEl.querySelector('.flip-card__flip-top .flip-card__digit').textContent = nextValue;
    cardEl.querySelector('.flip-card__flip-bottom .flip-card__digit').textContent = nextValue;
    return;
  }

  const topEl = cardEl.querySelector('.flip-card__top .flip-card__digit');
  const bottomEl = cardEl.querySelector('.flip-card__bottom .flip-card__digit');
  const flipTopEl = cardEl.querySelector('.flip-card__flip-top');
  const flipBottomEl = cardEl.querySelector('.flip-card__flip-bottom');
  const flipTop = flipTopEl.querySelector('.flip-card__digit');
  const flipBottom = flipBottomEl.querySelector('.flip-card__digit');

  topEl.textContent = currentValue;
  bottomEl.textContent = currentValue;
  flipTop.textContent = currentValue;
  flipBottom.textContent = nextValue;

  cardEl.classList.add('is-flipping');

  const onAnimationEnd = (event) => {
    if (event.target !== flipBottomEl) {
      return;
    }
    cardEl.classList.remove('is-flipping');
    topEl.textContent = nextValue;
    bottomEl.textContent = nextValue;
    cardEl.dataset.value = nextValue;
    flipBottomEl.removeEventListener('animationend', onAnimationEnd);
  };

  flipBottomEl.addEventListener('animationend', onAnimationEnd);
}

/**
 * Formatea el tiempo transcurrido como string
 * @param {Object} time - Objeto con días, horas, minutos y segundos
 * @returns {string} String formateado (ej: "12 días 03:45:21")
 */
function formatTime(time) {
  const { days, hours, minutes, seconds } = time;
  const h = String(hours).padStart(2, '0');
  const m = String(minutes).padStart(2, '0');
  const s = String(seconds).padStart(2, '0');
  
  if (days > 0) {
    return `${days} ${days === 1 ? 'día' : 'días'} ${h}:${m}:${s}`;
  }
  return `${h}:${m}:${s}`;
}

/**
 * Crea un elemento de contador en el DOM
 * @param {Object} counter - Objeto contador con id, name y startDate
 */
function createCounterElement(counter) {
  const template = document.getElementById('counter-template');
  const clone = template.content.cloneNode(true);
  
  const counterEl = clone.querySelector('.counter');
  counterEl.setAttribute('data-id', counter.id);
  
  const titleEl = clone.querySelector('.counter__title');
  titleEl.textContent = counter.name;
  
  const timeEl = clone.querySelector('.counter__time');
  timeEl.setAttribute('data-start', counter.startDate);
  buildFlipClock(timeEl);
  
  // Botones de acción
  const resetBtn = clone.querySelector('[data-action="reset"]');
  const deleteBtn = clone.querySelector('[data-action="delete"]');
  
  resetBtn.addEventListener('click', () => resetCounter(counter.id));
  resetBtn.addEventListener('touchend', (e) => {
    e.preventDefault();
    resetCounter(counter.id);
  });
  
  deleteBtn.addEventListener('click', () => deleteCounter(counter.id));
  deleteBtn.addEventListener('touchend', (e) => {
    e.preventDefault();
    deleteCounter(counter.id);
  });
  
  return counterEl;
}

/**
 * Actualiza el tiempo mostrado en un contador
 */
function updateCounterDisplay(counterEl) {
  const timeEl = counterEl.querySelector('.counter__time');
  const startDate = timeEl.getAttribute('data-start');
  const elapsed = calculateElapsedTime(startDate);
  TIME_UNITS.forEach(unit => {
    const unitEl = timeEl.querySelector(`.flip-unit[data-unit="${unit.key}"]`);
    if (!unitEl) {
      return;
    }
    const cardEl = unitEl.querySelector('.flip-card');
    const formatted = formatUnitValue(elapsed[unit.key], unit.minDigits);
    updateFlipCard(cardEl, formatted);
  });
}

/**
 * Renderiza todos los contadores en el DOM
 */
function renderCounters() {
  const container = document.getElementById('counter-list');
  const emptyState = document.getElementById('empty-state');
  
  // Limpiar contenedor
  container.innerHTML = '';
  
  if (counters.length === 0) {
    emptyState.style.display = 'block';
    return;
  }
  
  emptyState.style.display = 'none';
  
  // Crear y añadir cada contador
  counters.forEach(counter => {
    const counterEl = createCounterElement(counter);
    container.appendChild(counterEl);
  });
  
  // Actualizar todos los contadores inmediatamente
  updateAllCounters();
}

/**
 * Actualiza el tiempo de todos los contadores visibles
 */
function updateAllCounters() {
  const counterElements = document.querySelectorAll('.counter');
  counterElements.forEach(counterEl => {
    updateCounterDisplay(counterEl);
  });
}

/**
 * Inicia el temporizador global que actualiza todos los contadores
 */
function startUpdateTimer() {
  if (updateInterval) {
    return; // Ya está corriendo
  }
  
  // Actualizar cada segundo
  updateInterval = setInterval(() => {
    updateAllCounters();
  }, 1000);
}

/**
 * Detiene el temporizador global
 */
function stopUpdateTimer() {
  if (updateInterval) {
    clearInterval(updateInterval);
    updateInterval = null;
  }
}

/**
 * Crea un nuevo contador
 * @param {string} name - Nombre del contador
 * @param {string} startDate - Fecha de inicio en formato ISO
 */
function createCounter(name, startDate) {
  const newCounter = {
    id: Date.now().toString(),
    name: name.trim(),
    startDate: startDate
  };
  
  counters.push(newCounter);
  saveCounters();
  renderCounters();
  
  // Asegurar que el temporizador esté corriendo
  if (counters.length > 0) {
    startUpdateTimer();
  }
}

/**
 * Reinicia un contador (establece nueva fecha/hora de inicio)
 * @param {string} counterId - ID del contador a reiniciar
 */
function resetCounter(counterId) {
  if (!confirm('¿Estás seguro de que quieres reiniciar este contador? Se establecerá la fecha y hora actual como nuevo inicio.')) {
    return;
  }
  
  const counter = counters.find(c => c.id === counterId);
  if (!counter) {
    return;
  }
  
  // Establecer fecha/hora actual como nuevo inicio
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  
  counter.startDate = `${year}-${month}-${day}T${hours}:${minutes}`;
  saveCounters();
  renderCounters();
}

/**
 * Elimina un contador individual
 * @param {string} counterId - ID del contador a eliminar
 */
function deleteCounter(counterId) {
  if (!confirm('¿Estás seguro de que quieres eliminar este contador?')) {
    return;
  }
  
  counters = counters.filter(c => c.id !== counterId);
  saveCounters();
  renderCounters();
  
  // Si no hay contadores, detener el temporizador
  if (counters.length === 0) {
    stopUpdateTimer();
  }
}

/**
 * Elimina todos los contadores y resetea la aplicación
 */
function resetAll() {
  if (!confirm('¿Estás seguro de que quieres eliminar TODOS los contadores? Esta acción no se puede deshacer.')) {
    return;
  }
  
  counters = [];
  localStorage.removeItem(STORAGE_KEY);
  stopUpdateTimer();
  renderCounters();
}

/**
 * Maneja el envío del formulario para crear un nuevo contador
 */
function handleFormSubmit(event) {
  event.preventDefault();
  
  const nameInput = document.getElementById('counter-name');
  const startInput = document.getElementById('counter-start');
  
  const name = nameInput.value.trim();
  const startDate = startInput.value;
  
  if (!name || !startDate) {
    alert('Por favor, completa todos los campos.');
    return;
  }
  
  createCounter(name, startDate);
  
  // Limpiar formulario
  nameInput.value = '';
  startInput.value = '';
  nameInput.focus();
}

/**
 * Inicializa la aplicación cuando se carga la página
 */
function init() {
  // Cargar contadores desde LocalStorage
  loadCounters();
  
  // Renderizar contadores
  renderCounters();
  
  // Configurar formulario
  const form = document.getElementById('counter-form');
  form.addEventListener('submit', handleFormSubmit);
  
  // Configurar botón de resetear todo
  const resetAllBtn = document.getElementById('reset-all');
  resetAllBtn.addEventListener('click', resetAll);
  resetAllBtn.addEventListener('touchend', (e) => {
    e.preventDefault();
    resetAll();
  });

  const viewModeSelect = document.getElementById('view-mode');
  const currentViewMode = 'flip';
  viewModeSelect.value = currentViewMode;
  setViewMode(currentViewMode);
  viewModeSelect.addEventListener('change', (event) => {
    setViewMode(event.target.value);
  });

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch((error) => {
        console.error('Error al registrar el Service Worker:', error);
      });
    });
  }
  
  // Establecer fecha/hora actual por defecto en el input
  const startInput = document.getElementById('counter-start');
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  startInput.value = `${year}-${month}-${day}T${hours}:${minutes}`;
  
  // Iniciar temporizador si hay contadores
  if (counters.length > 0) {
    startUpdateTimer();
  }
  
  // Limpiar temporizador cuando la página se oculta (optimización)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      // No detenemos el temporizador, solo pausamos visualmente
      // El temporizador seguirá corriendo y actualizará cuando vuelva a ser visible
    }
  });
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
