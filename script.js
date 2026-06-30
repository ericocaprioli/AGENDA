let currentMonth = new Date().getMonth();
let currentYear = 2026;
let events = {};
let loadToken = 0;
const monthNames = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const weekDays = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
const PAGE_SIZE = 100;
const COLLECTION_NAME = 'eventos';

function showToast(message, type = 'error') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

function setLoadingState(isLoading) {
    const header = document.getElementById('calendarHeader');
    const monthSelect = document.getElementById('monthSelect');
    const todayBtn = document.querySelector('.controls .btn-primary');
    const grid = document.getElementById('calendarGrid');
    if (monthSelect) monthSelect.disabled = isLoading;
    if (todayBtn) todayBtn.disabled = isLoading;
    if (grid) grid.classList.toggle('loading', isLoading);
    if (isLoading && header) {
        header.dataset.baseText = `${monthNames[currentMonth]} ${currentYear}`;
        header.textContent = `${header.dataset.baseText} — carregando…`;
    }
}

function getMonthDateRange(year, month) {
    const start = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const nextMonth = new Date(year, month + 1, 1);
    const end = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-01`;
    return { start, end };
}

async function loadEventsFromSupabase(year, month) {
    const { start, end } = getMonthDateRange(year, month);
    const supabaseEvents = {};
    
    try {
        const { data, error } = await supabase
            .from(COLLECTION_NAME)
            .select('*')
            .gte('data', start)
            .lt('data', end)
            .order('data')
            .limit(PAGE_SIZE);
        
        if (error) throw error;
        
        data.forEach(doc => {
            const date = doc.data;
            if (!supabaseEvents[date]) {
                supabaseEvents[date] = [];
            }
            supabaseEvents[date].push({
                id: doc.id,
                title: doc.titulo,
                type: doc.tipo,
                created: doc.criadoEm
            });
        });
        
        return supabaseEvents;
    } catch (error) {
        console.error('Erro ao carregar eventos do Supabase:', error);
        throw error;
    }
}

async function loadMonthEvents(year, month) {
    const myToken = ++loadToken;
    setLoadingState(true);
    try {
        const monthEvents = await loadEventsFromSupabase(year, month);
        if (myToken !== loadToken) return;
        events = monthEvents;
    } catch (error) {
        if (myToken !== loadToken) return;
        events = {};
        showToast('Não foi possível carregar os eventos públicos.');
    }
    if (myToken === loadToken) {
        setLoadingState(false);
        renderCalendar();
    }
}

function renderCalendar() {
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const calendarGrid = document.getElementById('calendarGrid');
    const calendarHeader = document.getElementById('calendarHeader');
    if (!calendarGrid || !calendarHeader) return;
    calendarHeader.textContent = `${monthNames[currentMonth]} ${currentYear}`;
    calendarGrid.innerHTML = '';
    weekDays.forEach(day => {
        const dayElement = document.createElement('div');
        dayElement.className = 'weekday';
        dayElement.textContent = day;
        calendarGrid.appendChild(dayElement);
    });
    for (let i = 0; i < firstDay; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'calendar-day';
        calendarGrid.appendChild(emptyDay);
    }
    for (let day = 1; day <= daysInMonth; day++) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        dayElement.dataset.date = dateStr;
        const dayNumber = document.createElement('div');
        dayNumber.className = 'day-number';
        dayNumber.textContent = day;
        dayElement.appendChild(dayNumber);
        const holiday = calendarData.holidays?.[dateStr];
        const schoolEvent = calendarData.schoolEvents?.[dateStr];
        const userEvents = events[dateStr] || [];
        if (holiday) {
            dayElement.classList.add(`color-${holiday.type}`);
            dayElement.title = holiday.title;
        }
        if (schoolEvent) {
            dayElement.classList.add(`color-${schoolEvent.type}`);
            dayElement.title = schoolEvent.title;
        }
        const officialEvents = [];
        if (holiday) officialEvents.push(holiday);
        if (schoolEvent) officialEvents.push(schoolEvent);
        if (officialEvents.length > 0) {
            const indicatorContainer = document.createElement('div');
            officialEvents.slice(0, 3).forEach(event => {
                if (event.type) {
                    const indicator = document.createElement('span');
                    indicator.className = `event-indicator color-${event.type}`;
                    indicatorContainer.appendChild(indicator);
                }
            });
            dayElement.appendChild(indicatorContainer);
        }
        if (userEvents.length > 0) {
            const userContainer = document.createElement('div');
            userContainer.className = 'meeting-container';
            userEvents.forEach(meeting => {
                const meetingItem = document.createElement('div');
                meetingItem.className = 'meeting-item readonly';
                meetingItem.textContent = meeting.title || 'Evento';
                userContainer.appendChild(meetingItem);
            });
            dayElement.appendChild(userContainer);
        }
        calendarGrid.appendChild(dayElement);
    }
}

async function goToToday() {
    const today = new Date();
    const newMonth = today.getMonth();
    const newYear = today.getFullYear();
    if (newMonth === currentMonth && newYear === currentYear) return;
    currentMonth = newMonth;
    currentYear = newYear;
    const monthSelect = document.getElementById('monthSelect');
    if (monthSelect) monthSelect.value = currentMonth;
    await loadMonthEvents(currentYear, currentMonth);
}

async function initCalendar() {
    const monthSelect = document.getElementById('monthSelect');
    if (monthSelect) {
        monthSelect.value = currentMonth;
        monthSelect.addEventListener('change', async (event) => {
            currentMonth = parseInt(event.target.value, 10);
            await loadMonthEvents(currentYear, currentMonth);
        });
    }
    await loadMonthEvents(currentYear, currentMonth);
}

document.addEventListener('DOMContentLoaded', initCalendar);
