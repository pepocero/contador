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
      // Migrar contadores antiguos a la nueva estructura
      counters = counters.map(counter => {
        if (!counter.resetHistory) {
          counter.resetHistory = [];
        }
        if (!counter.originalStartDate) {
          counter.originalStartDate = counter.startDate;
        }
        if (!counter.createdAt) {
          counter.createdAt = new Date().toISOString();
        }
        return counter;
      });
      saveCounters(); // Guardar estructura migrada
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

/**
 * Exporta los contadores a un archivo JSON
 */
function exportCounters() {
  try {
    const dataStr = JSON.stringify(counters, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `contadores-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error al exportar contadores:', error);
    alert('Error al exportar los datos. Por favor, inténtalo de nuevo.');
  }
}

/**
 * Importa contadores desde un archivo JSON
 */
function importCounters(file) {
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const imported = JSON.parse(e.target.result);
      if (!Array.isArray(imported)) {
        alert('El archivo no tiene un formato válido. Debe ser un array de contadores.');
        return;
      }
      
      if (!confirm(`Se importarán ${imported.length} contador(es). ¿Deseas reemplazar los contadores existentes o agregarlos?`)) {
        return;
      }
      
      const replace = confirm('¿Reemplazar contadores existentes? (Sí = reemplazar, No = agregar)');
      
      if (replace) {
        counters = imported.map(counter => {
          // Asegurar estructura completa
          if (!counter.resetHistory) counter.resetHistory = [];
          if (!counter.originalStartDate) counter.originalStartDate = counter.startDate;
          if (!counter.createdAt) counter.createdAt = new Date().toISOString();
          return counter;
        });
      } else {
        // Agregar nuevos contadores con IDs únicos
        imported.forEach(counter => {
          counter.id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
          if (!counter.resetHistory) counter.resetHistory = [];
          if (!counter.originalStartDate) counter.originalStartDate = counter.startDate;
          if (!counter.createdAt) counter.createdAt = new Date().toISOString();
          counters.push(counter);
        });
      }
      
      saveCounters();
      renderCounters();
      renderStatistics();
      alert(`Contadores importados exitosamente. Total: ${counters.length}`);
    } catch (error) {
      console.error('Error al importar contadores:', error);
      alert('Error al importar los datos. Verifica que el archivo sea válido.');
    }
  };
  reader.readAsText(file);
}

/**
 * Calcula las estadísticas de todos los contadores
 */
function calculateStatistics() {
  if (counters.length === 0) {
    return null;
  }
  
  const stats = {
    totalCounters: counters.length,
    totalResets: 0,
    counters: []
  };
  
  counters.forEach(counter => {
    const resetCount = counter.resetHistory ? counter.resetHistory.length : 0;
    stats.totalResets += resetCount;
    
    // Calcular duración actual
    const currentStart = new Date(counter.startDate);
    const now = new Date();
    const currentDuration = now - currentStart;
    
    // Calcular duración máxima histórica
    let maxDuration = currentDuration;
    let maxDurationPeriod = {
      startDate: counter.startDate,
      endDate: now.toISOString(),
      duration: currentDuration
    };
    
    if (counter.resetHistory && counter.resetHistory.length > 0) {
      counter.resetHistory.forEach(period => {
        if (period.duration > maxDuration) {
          maxDuration = period.duration;
          maxDurationPeriod = period;
        }
      });
    }
    
    // Calcular duración promedio
    let totalDuration = currentDuration;
    let periodCount = 1;
    if (counter.resetHistory && counter.resetHistory.length > 0) {
      counter.resetHistory.forEach(period => {
        totalDuration += period.duration;
        periodCount++;
      });
    }
    const avgDuration = totalDuration / periodCount;
    
    stats.counters.push({
      id: counter.id,
      name: counter.name,
      resetCount: resetCount,
      currentDuration: currentDuration,
      maxDuration: maxDuration,
      maxDurationPeriod: maxDurationPeriod,
      avgDuration: avgDuration,
      createdAt: counter.createdAt || counter.originalStartDate,
      originalStartDate: counter.originalStartDate || counter.startDate
    });
  });
  
  // Ordenar por duración máxima
  stats.counters.sort((a, b) => b.maxDuration - a.maxDuration);
  
  return stats;
}

/**
 * Formatea una duración en milisegundos a un string legible
 */
function formatDuration(ms) {
  if (ms < 0) return '0';
  
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(months / 12);
  
  if (years > 0) {
    return `${years} año${years !== 1 ? 's' : ''} ${months % 12} mes${(months % 12) !== 1 ? 'es' : ''}`;
  } else if (months > 0) {
    return `${months} mes${months !== 1 ? 'es' : ''} ${days % 30} día${(days % 30) !== 1 ? 's' : ''}`;
  } else if (days > 0) {
    return `${days} día${days !== 1 ? 's' : ''} ${hours % 24}h ${minutes % 60}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Renderiza las estadísticas
 */
function renderStatistics() {
  const statsContainer = document.getElementById('stats-content');
  if (!statsContainer) return;
  
  const stats = calculateStatistics();
  
  if (!stats) {
    statsContainer.innerHTML = '<p class="empty-state">No hay contadores para mostrar estadísticas.</p>';
    return;
  }
  
  let html = `
    <div class="stats-summary">
      <div class="stat-card">
        <div class="stat-card__value">${stats.totalCounters}</div>
        <div class="stat-card__label">Total Contadores</div>
      </div>
      <div class="stat-card">
        <div class="stat-card__value">${stats.totalResets}</div>
        <div class="stat-card__label">Total Reinicios</div>
      </div>
      <div class="stat-card">
        <div class="stat-card__value">${(stats.totalResets / stats.totalCounters).toFixed(1)}</div>
        <div class="stat-card__label">Promedio Reinicios</div>
      </div>
    </div>
    
    <div class="stats-section">
      <h3>Contador con Mayor Duración</h3>
      <div class="stat-highlight">
        <div class="stat-highlight__name">${stats.counters[0].name}</div>
        <div class="stat-highlight__value">${formatDuration(stats.counters[0].maxDuration)}</div>
        <div class="stat-highlight__meta">${stats.counters[0].resetCount} reinicio${stats.counters[0].resetCount !== 1 ? 's' : ''}</div>
      </div>
    </div>
    
    <div class="stats-section">
      <h3>Estadísticas por Contador</h3>
      <div class="stats-table">
        <table>
          <thead>
            <tr>
              <th>Contador</th>
              <th>Reinicios</th>
              <th>Duración Actual</th>
              <th>Duración Máxima</th>
              <th>Duración Promedio</th>
            </tr>
          </thead>
          <tbody>
  `;
  
  stats.counters.forEach(counter => {
    html += `
      <tr>
        <td><strong>${counter.name}</strong></td>
        <td>${counter.resetCount}</td>
        <td>${formatDuration(counter.currentDuration)}</td>
        <td>${formatDuration(counter.maxDuration)}</td>
        <td>${formatDuration(counter.avgDuration)}</td>
      </tr>
    `;
  });
  
  html += `
          </tbody>
        </table>
      </div>
    </div>
    
    <div class="stats-section">
      <h3>Gráfico de Reinicios</h3>
      <div class="chart-container">
        <div class="chart-bars">
  `;
  
  // Gráfico de barras de reinicios
  const maxResets = Math.max(...stats.counters.map(c => c.resetCount), 1);
  stats.counters.forEach(counter => {
    const percentage = maxResets > 0 ? (counter.resetCount / maxResets) * 100 : 0;
    html += `
      <div class="chart-bar-item">
        <div class="chart-bar-label">${counter.name}</div>
        <div class="chart-bar-wrapper">
          <div class="chart-bar" style="width: ${percentage}%">
            <span class="chart-bar-value">${counter.resetCount}</span>
          </div>
        </div>
      </div>
    `;
  });
  
  html += `
        </div>
      </div>
    </div>
    
    <div class="stats-section">
      <h3>Gráfico de Duración Máxima</h3>
      <div class="chart-container">
        <div class="chart-bars">
  `;
  
  // Gráfico de barras de duración máxima
  const maxDuration = Math.max(...stats.counters.map(c => c.maxDuration), 1);
  stats.counters.forEach(counter => {
    const percentage = (counter.maxDuration / maxDuration) * 100;
    html += `
      <div class="chart-bar-item">
        <div class="chart-bar-label">${counter.name}</div>
        <div class="chart-bar-wrapper">
          <div class="chart-bar chart-bar--duration" style="width: ${percentage}%">
            <span class="chart-bar-value">${formatDuration(counter.maxDuration)}</span>
          </div>
        </div>
      </div>
    `;
  });
  
  html += `
        </div>
      </div>
    </div>
  `;
  
  statsContainer.innerHTML = html;
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
  const startDate = new Date(counter.startDate);
  const formattedDate = startDate.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
  titleEl.textContent = `${counter.name} (${formattedDate})`;
  
  const timeEl = clone.querySelector('.counter__time');
  timeEl.setAttribute('data-start', counter.startDate);
  buildFlipClock(timeEl);
  
  // Botones de acción
  const editBtn = clone.querySelector('[data-action="edit"]');
  const resetBtn = clone.querySelector('[data-action="reset"]');
  const deleteBtn = clone.querySelector('[data-action="delete"]');
  
  editBtn.addEventListener('click', () => editCounter(counter.id));
  editBtn.addEventListener('touchend', (e) => {
    e.preventDefault();
    editCounter(counter.id);
  });
  
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
  
  // Actualizar estadísticas
  renderStatistics();
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
    startDate: startDate,
    createdAt: new Date().toISOString(),
    resetHistory: [],
    originalStartDate: startDate
  };
  
  counters.push(newCounter);
  saveCounters();
  renderCounters();
  renderStatistics();
  
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
  if (!confirm('¿Estás seguro de que quieres reiniciar este contador?\n\nSe establecerá la fecha y hora actual como nuevo inicio.\n\n⚠️ Esta acción es IRREVERSIBLE. El tiempo transcurrido anterior se perderá permanentemente.')) {
    return;
  }
  
  const counter = counters.find(c => c.id === counterId);
  if (!counter) {
    return;
  }
  
  // Guardar el historial antes de reiniciar
  const previousStartDate = counter.startDate;
  const resetDate = new Date();
  const previousEndDate = resetDate.toISOString();
  
  // Calcular la duración del período anterior
  const previousStart = new Date(previousStartDate);
  const duration = resetDate - previousStart;
  
  // Agregar al historial de reinicios
  if (!counter.resetHistory) {
    counter.resetHistory = [];
  }
  if (!counter.originalStartDate) {
    counter.originalStartDate = previousStartDate;
  }
  
  counter.resetHistory.push({
    startDate: previousStartDate,
    endDate: previousEndDate,
    duration: duration,
    resetAt: previousEndDate
  });
  
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
  renderStatistics();
}

/**
 * Elimina un contador individual
 * @param {string} counterId - ID del contador a eliminar
 */
function deleteCounter(counterId) {
  if (!confirm('¿Estás seguro de que quieres eliminar este contador?\n\n⚠️ Esta acción es IRREVERSIBLE. El contador y todos sus datos se perderán permanentemente y no podrán recuperarse.')) {
    return;
  }
  
  counters = counters.filter(c => c.id !== counterId);
  saveCounters();
  renderCounters();
  renderStatistics();
  
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
  renderStatistics();
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
  
  // Limpiar formulario y restablecer fecha por defecto
  nameInput.value = '';
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  startInput.value = `${year}-${month}-${day}T${hours}:${minutes}`;
  nameInput.focus();
}

/**
 * Funciones de Sidebar
 */
function openSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  sidebar.classList.add('sidebar--open');
  overlay.classList.add('sidebar-overlay--visible');
  document.body.classList.add('sidebar-open');
}

function closeSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  sidebar.classList.remove('sidebar--open');
  overlay.classList.remove('sidebar-overlay--visible');
  document.body.classList.remove('sidebar-open');
}

/**
 * Funciones de Modales
 */
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('modal--open');
    document.body.classList.add('modal-open');
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('modal--open');
    // Solo quitar la clase si no hay otros modales abiertos
    const openModals = document.querySelectorAll('.modal.modal--open');
    if (openModals.length === 0) {
      document.body.classList.remove('modal-open');
    }
  }
}

function closeAllModals() {
  closeModal('modal-new');
  closeModal('modal-edit');
  document.body.classList.remove('modal-open');
}

/**
 * Navegación entre páginas
 */
function showPage(pageId) {
  // Ocultar todas las páginas
  document.querySelectorAll('.page').forEach(page => {
    page.classList.remove('page--active');
  });
  
  // Mostrar la página seleccionada
  const page = document.getElementById(pageId);
  if (page) {
    page.classList.add('page--active');
  }
  
  // Actualizar estado del sidebar
  document.querySelectorAll('.sidebar__item').forEach(item => {
    item.classList.remove('sidebar__item--active');
  });
  
  if (pageId === 'page-counters') {
    document.getElementById('menu-counters')?.classList.add('sidebar__item--active');
  } else if (pageId === 'page-stats') {
    document.getElementById('menu-stats')?.classList.add('sidebar__item--active');
    renderStatistics();
  }
  
  closeSidebar();
}

/**
 * Editar contador
 */
function editCounter(counterId) {
  const counter = counters.find(c => c.id === counterId);
  if (!counter) return;
  
  // Llenar el formulario de edición
  document.getElementById('edit-counter-id').value = counter.id;
  document.getElementById('edit-counter-name').value = counter.name;
  
  // Formatear fecha para el input datetime-local
  const startDate = new Date(counter.startDate);
  const year = startDate.getFullYear();
  const month = String(startDate.getMonth() + 1).padStart(2, '0');
  const day = String(startDate.getDate()).padStart(2, '0');
  const hours = String(startDate.getHours()).padStart(2, '0');
  const minutes = String(startDate.getMinutes()).padStart(2, '0');
  document.getElementById('edit-counter-start').value = `${year}-${month}-${day}T${hours}:${minutes}`;
  
  openModal('modal-edit');
}

/**
 * Guardar cambios de edición
 */
function saveEditCounter(counterId, name, startDate) {
  const counter = counters.find(c => c.id === counterId);
  if (!counter) return;
  
  counter.name = name.trim();
  counter.startDate = startDate;
  
  saveCounters();
  renderCounters();
  renderStatistics();
  closeModal('modal-edit');
}

/**
 * Inicializa la aplicación cuando se carga la página
 */
function init() {
  // Cargar contadores desde LocalStorage
  loadCounters();
  
  // Renderizar contadores
  renderCounters();
  
  // Configurar Sidebar
  const sidebarToggle = document.getElementById('sidebar-toggle');
  const sidebarClose = document.getElementById('sidebar-close');
  const sidebarOverlay = document.getElementById('sidebar-overlay');
  
  sidebarToggle.addEventListener('click', openSidebar);
  sidebarToggle.addEventListener('touchend', (e) => {
    e.preventDefault();
    openSidebar();
  });
  
  sidebarClose.addEventListener('click', closeSidebar);
  sidebarClose.addEventListener('touchend', (e) => {
    e.preventDefault();
    closeSidebar();
  });
  
  sidebarOverlay.addEventListener('click', closeSidebar);
  sidebarOverlay.addEventListener('touchend', (e) => {
    e.preventDefault();
    closeSidebar();
  });
  
  // Configurar navegación del sidebar
  document.getElementById('menu-counters').addEventListener('click', () => showPage('page-counters'));
  document.getElementById('menu-counters').addEventListener('touchend', (e) => {
    e.preventDefault();
    showPage('page-counters');
  });
  
  document.getElementById('menu-stats').addEventListener('click', () => showPage('page-stats'));
  document.getElementById('menu-stats').addEventListener('touchend', (e) => {
    e.preventDefault();
    showPage('page-stats');
  });
  
  document.getElementById('menu-new').addEventListener('click', () => {
    openModal('modal-new');
    closeSidebar();
  });
  document.getElementById('menu-new').addEventListener('touchend', (e) => {
    e.preventDefault();
    openModal('modal-new');
    closeSidebar();
  });
  
  // Botón volver desde estadísticas
  document.getElementById('back-to-counters').addEventListener('click', () => showPage('page-counters'));
  document.getElementById('back-to-counters').addEventListener('touchend', (e) => {
    e.preventDefault();
    showPage('page-counters');
  });
  
  // Configurar formulario de nuevo contador
  const form = document.getElementById('counter-form');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    handleFormSubmit(e);
    closeModal('modal-new');
  });
  
  // Configurar formulario de editar contador
  const editForm = document.getElementById('edit-counter-form');
  editForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const counterId = document.getElementById('edit-counter-id').value;
    const name = document.getElementById('edit-counter-name').value;
    const startDate = document.getElementById('edit-counter-start').value;
    saveEditCounter(counterId, name, startDate);
  });
  
  // Cerrar modales
  document.querySelectorAll('.modal__close, .modal__cancel').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.closest('#modal-new')) {
        closeModal('modal-new');
      } else if (btn.closest('#modal-edit')) {
        closeModal('modal-edit');
      }
    });
    btn.addEventListener('touchend', (e) => {
      e.preventDefault();
      if (btn.closest('#modal-new')) {
        closeModal('modal-new');
      } else if (btn.closest('#modal-edit')) {
        closeModal('modal-edit');
      }
    });
  });
  
  // Cerrar modal al hacer clic en overlay
  document.querySelectorAll('.modal__overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeAllModals();
      }
    });
  });
  
  // Configurar botones del sidebar
  document.getElementById('menu-export').addEventListener('click', () => {
    exportCounters();
    closeSidebar();
  });
  document.getElementById('menu-export').addEventListener('touchend', (e) => {
    e.preventDefault();
    exportCounters();
    closeSidebar();
  });
  
  const importFile = document.getElementById('import-file');
  importFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      importCounters(file);
      e.target.value = '';
      closeSidebar();
    }
  });
  
  const resetAllBtn = document.getElementById('menu-reset-all');
  resetAllBtn.addEventListener('click', () => {
    resetAll();
    closeSidebar();
  });
  resetAllBtn.addEventListener('touchend', (e) => {
    e.preventDefault();
    resetAll();
    closeSidebar();
  });

  // Configurar selector de vista en sidebar
  const viewModeSelect = document.getElementById('view-mode');
  const savedViewMode = localStorage.getItem(VIEW_MODE_KEY) || 'flip';
  viewModeSelect.value = savedViewMode;
  setViewMode(savedViewMode);
  viewModeSelect.addEventListener('change', (event) => {
    setViewMode(event.target.value);
    closeSidebar();
  });

  const installButton = document.getElementById('menu-install');
  let deferredPrompt = null;

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event;
    installButton.hidden = false;
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    installButton.hidden = true;
  });

  installButton.addEventListener('click', async () => {
    if (!deferredPrompt) {
      alert('La instalación no está disponible en este navegador. Si usas iOS, abre en Safari y elige "Añadir a pantalla de inicio".');
      return;
    }
    deferredPrompt.prompt();
    try {
      await deferredPrompt.userChoice;
    } catch (error) {
      console.error('Error en la instalación:', error);
    }
    deferredPrompt = null;
    installButton.hidden = true;
  });

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      // Leer versión del service worker para cache-busting
      let swVersion = '?v=' + Date.now();
      try {
        const swResponse = await fetch('./sw.js?nocache=' + Date.now());
        const swText = await swResponse.text();
        const versionMatch = swText.match(/VERSION:\s*(\d+)/);
        if (versionMatch) {
          swVersion = '?v=' + versionMatch[1];
        }
      } catch (error) {
        console.warn('No se pudo leer la versión del SW:', error);
      }
      
      navigator.serviceWorker
        .register('./sw.js' + swVersion, { updateViaCache: 'none' })
        .then((registration) => {
          const promptUpdate = () => {
            if (!registration.waiting) {
              return;
            }
            const accept = confirm('Hay una nueva versión disponible. ¿Quieres actualizar ahora?');
            if (accept) {
              registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            }
          };

          // Verificar actualizaciones periódicamente (cada 60 segundos)
          setInterval(() => {
            registration.update();
          }, 60000);

          // Verificar actualizaciones al recuperar el foco
          window.addEventListener('focus', () => {
            registration.update();
          });

          if (registration.waiting) {
            promptUpdate();
          }

          registration.addEventListener('updatefound', () => {
            const installing = registration.installing;
            if (!installing) {
              return;
            }
            installing.addEventListener('statechange', () => {
              if (installing.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                  // Hay una nueva versión esperando
                  promptUpdate();
                } else {
                  // Primera instalación
                  console.log('Service Worker instalado por primera vez');
                }
              }
            });
          });

          navigator.serviceWorker.addEventListener('controllerchange', () => {
            window.location.reload();
          });
        })
        .catch((error) => {
          // Solo mostrar error si no es por protocolo file://
          if (window.location.protocol !== 'file:') {
            console.error('Error al registrar el Service Worker:', error);
          }
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
  
  // Mostrar página de contadores por defecto
  showPage('page-counters');
  
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
