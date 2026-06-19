const monthNames = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const weekDays = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
const MAX_TITLE_LENGTH = 200;

let currentMonth = new Date().getMonth();
let currentYear = 2026;
let events = {};
let loadToken = 0;
let currentUser = null;

const { Client, Databases, ID, Query, Account } = Appwrite;
const client = new Client()
    .setEndpoint('https://nyc.cloud.appwrite.io/v1')
    .setProject('agenda-escolar-2026');
const account = new Account(client);
const databases = new Databases(client);

const DATABASE_ID = '69f38f600004d1b7c5ce';
const COLLECTION_ID = 'eventos';
const PAGE_SIZE = 100;

function showToast(message, type = 'error') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

function setLoadingState(isLoading) {
    const header = document.getElementById('calendarHeader');
    const monthSelect = document.getElementById('monthSelect');
    const todayBtn = document.getElementById('todayButton');
    const grid = document.getElementById('calendarGrid');
    monthSelect.disabled = isLoading;
    if (todayBtn) todayBtn.disabled = isLoading;
    if (grid) grid.classList.toggle('loading', isLoading);
    if (isLoading) {
        header.dataset.baseText = `${monthNames[currentMonth]} ${currentYear}`;
        header.textContent = `${header.dataset.baseText} — carregando…`;
    }
}

function formatDate(dateStr) {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
}

function getMonthDateRange(year, month) {
    const start = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const nextMonth = new Date(year, month + 1, 1);
    const end = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-01`;
    return { start, end };
}

async function loadEventsFromAppwrite(year, month) {
    const { start, end } = getMonthDateRange(year, month);
    const appwriteEvents = {};
    let lastId = null;

    try {
        while (true) {
            const queries = [
                Query.greaterThanEqual('data', start),
                Query.lessThan('data', end),
                Query.orderAsc('data'),
                Query.limit(PAGE_SIZE)
            ];
            if (lastId) {
                queries.push(Query.cursorAfter(lastId));
            }

            const response = await databases.listDocuments(DATABASE_ID, COLLECTION_ID, queries);
            response.documents.forEach(doc => {
                const date = doc.data;
                if (!appwriteEvents[date]) {
                    appwriteEvents[date] = [];
                }
                appwriteEvents[date].push({
                    id: doc.$id,
                    title: doc.titulo,
                    type: doc.tipo,
                    created: doc.criadoEm
                });
            });

            if (response.documents.length < PAGE_SIZE) {
                break;
            }
            lastId = response.documents[response.documents.length - 1].$id;
        }

        return appwriteEvents;
    } catch (error) {
        console.error('Erro ao carregar eventos do Appwrite:', error);
        throw error;
    }
}

async function saveEventToAppwrite(date, title) {
    const cleanTitle = String(title).trim().slice(0, MAX_TITLE_LENGTH);
    if (!cleanTitle) return null;

    try {
        const response = await databases.createDocument(
            DATABASE_ID,
            COLLECTION_ID,
            ID.unique(),
            {
                data: date,
                titulo: cleanTitle,
                tipo: 'cyan'
            }
        );
        return response;
    } catch (error) {
        console.error('Erro ao salvar evento no Appwrite:', error);
        return null;
    }
}

async function updateEventInAppwrite(eventId, title) {
    const cleanTitle = String(title).trim().slice(0, MAX_TITLE_LENGTH);
    if (!cleanTitle) return false;

    try {
        await databases.updateDocument(DATABASE_ID, COLLECTION_ID, eventId, { titulo: cleanTitle });
        return true;
    } catch (error) {
        console.error('Erro ao atualizar evento no Appwrite:', error);
        return false;
    }
}

async function deleteEventFromAppwrite(eventId) {
    try {
        await databases.deleteDocument(DATABASE_ID, COLLECTION_ID, eventId);
        return true;
    } catch (error) {
        console.error('Erro ao deletar evento do Appwrite:', error);
        return false;
    }
}

async function loadMonthEvents(year, month) {
    const myToken = ++loadToken;
    setLoadingState(true);

    try {
        const monthEvents = await loadEventsFromAppwrite(year, month);
        if (myToken !== loadToken) return;
        events = monthEvents;
    } catch (error) {
        if (myToken !== loadToken) return;
        console.error('Erro ao carregar eventos do mês:', error);
        showToast('Não foi possível carregar os eventos salvos deste mês.');
        events = {};
    }

    if (myToken === loadToken) {
        setLoadingState(false);
        renderCalendar();
    }
}

function updateAuthUI() {
    const authPanel = document.getElementById('authPanel');
    const adminStatus = document.getElementById('adminStatus');
    const userEmail = document.getElementById('userEmail');
    const authMessage = document.querySelector('.admin-message');

    if (currentUser) {
        authPanel.classList.add('hidden');
        adminStatus.classList.remove('hidden');
        userEmail.textContent = currentUser.email || currentUser.name || 'Administrador';
        authMessage.textContent = 'Você está logado. Clique em qualquer dia para adicionar um evento à agenda.';
    } else {
        authPanel.classList.remove('hidden');
        adminStatus.classList.add('hidden');
        authMessage.textContent = 'Faça login para adicionar, editar e excluir eventos da agenda.';
    }
}

async function restoreSession() {
    try {
        currentUser = await account.get();
    } catch (error) {
        currentUser = null;
    }
    updateAuthUI();
}

async function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('emailInput').value.trim();
    const password = document.getElementById('passwordInput').value;

    if (!email || !password) {
        showToast('Preencha e-mail e senha antes de continuar.');
        return;
    }

    try {
        await account.createEmailSession(email, password);
        currentUser = await account.get();
        updateAuthUI();
        showToast('Login realizado com sucesso.', 'success');
        await loadMonthEvents(currentYear, currentMonth);
    } catch (error) {
        console.error('Erro de autenticação:', error);
        showToast('Falha no login. Verifique e tente novamente.');
    }
}

async function handleSignOut() {
    try {
        await account.deleteSession('current');
    } catch (error) {
        console.warn('Falha ao encerrar sessão:', error);
    }
    currentUser = null;
    updateAuthUI();
    showToast('Sessão encerrada.', 'success');
}

function renderCalendar() {
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const calendarGrid = document.getElementById('calendarGrid');
    const calendarHeader = document.getElementById('calendarHeader');

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

        const holiday = calendarData.holidays[dateStr];
        const schoolEvent = calendarData.schoolEvents[dateStr];
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
            userEvents.forEach((meeting, index) => {
                const meetingItem = document.createElement('div');
                meetingItem.className = 'meeting-item';

                const textSpan = document.createElement('span');
                textSpan.className = 'meeting-text';
                textSpan.textContent = meeting.title;

                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'meeting-delete';
                deleteBtn.type = 'button';
                deleteBtn.textContent = '×';
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    deleteMeeting(dateStr, index);
                });

                meetingItem.appendChild(textSpan);
                meetingItem.appendChild(deleteBtn);
                meetingItem.addEventListener('click', (e) => {
                    if (!e.target.classList.contains('meeting-delete')) {
                        editMeetingInline(meetingItem, dateStr, index);
                    }
                });
                userContainer.appendChild(meetingItem);
            });
            dayElement.appendChild(userContainer);
        }

        dayElement.addEventListener('click', (e) => {
            if (!e.target.closest('.meeting-item') && !e.target.closest('.event-indicator')) {
                if (!currentUser) {
                    showToast('Faça login para adicionar um evento.');
                    return;
                }
                addNewMeetingInline(dateStr, dayElement);
            }
        });

        calendarGrid.appendChild(dayElement);
    }
}

function addNewMeetingInline(dateStr, dayElement) {
    if (!events[dateStr]) {
        events[dateStr] = [];
    }

    const newMeeting = { title: '', type: 'cyan' };
    events[dateStr].push(newMeeting);
    const newIndex = events[dateStr].length - 1;

    let meetingContainer = dayElement.querySelector('.meeting-container');
    if (!meetingContainer) {
        meetingContainer = document.createElement('div');
        meetingContainer.className = 'meeting-container';
        dayElement.appendChild(meetingContainer);
    }

    const meetingItem = document.createElement('div');
    meetingItem.className = 'meeting-item editing';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'meeting-input';
    input.placeholder = 'Digite o evento...';
    input.maxLength = MAX_TITLE_LENGTH;

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'meeting-delete';
    deleteBtn.type = 'button';
    deleteBtn.textContent = '×';
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteMeeting(dateStr, newIndex);
    });

    meetingItem.appendChild(input);
    meetingItem.appendChild(deleteBtn);
    meetingContainer.appendChild(meetingItem);
    input.focus();

    input.addEventListener('blur', async () => {
        const value = input.value.trim().slice(0, MAX_TITLE_LENGTH);
        if (value) {
            if (!events[dateStr] || !events[dateStr][newIndex]) {
                return;
            }
            events[dateStr][newIndex].title = value;
            const response = await saveEventToAppwrite(dateStr, value);
            if (response) {
                events[dateStr][newIndex].id = response.$id;
                showToast('Evento salvo.', 'success');
            } else {
                showToast('Não foi possível salvar o evento.');
                events[dateStr].splice(newIndex, 1);
            }
        } else {
            events[dateStr].splice(newIndex, 1);
            if (events[dateStr].length === 0) {
                delete events[dateStr];
            }
        }
        renderCalendar();
    });

    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            input.blur();
        }
    });
}

async function editMeetingInline(meetingItem, dateStr, index) {
    if (!currentUser) {
        showToast('Faça login para editar.');
        return;
    }

    const textElement = meetingItem.querySelector('.meeting-text');
    if (!textElement) {
        return;
    }

    const currentText = textElement.textContent;
    meetingItem.classList.add('editing');
    meetingItem.innerHTML = '';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'meeting-input';
    input.value = currentText;
    input.maxLength = MAX_TITLE_LENGTH;

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'meeting-delete';
    deleteBtn.type = 'button';
    deleteBtn.textContent = '×';
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteMeeting(dateStr, index);
    });

    meetingItem.appendChild(input);
    meetingItem.appendChild(deleteBtn);
    input.focus();
    input.select();

    input.addEventListener('blur', async () => {
        const value = input.value.trim().slice(0, MAX_TITLE_LENGTH);
        if (value) {
            if (!events[dateStr] || !events[dateStr][index]) {
                renderCalendar();
                return;
            }
            events[dateStr][index].title = value;
            if (events[dateStr][index].id) {
                const ok = await updateEventInAppwrite(events[dateStr][index].id, value);
                if (!ok) {
                    showToast('Não foi possível atualizar o evento.');
                }
            }
        } else {
            await deleteMeeting(dateStr, index);
            return;
        }
        renderCalendar();
    });

    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            input.blur();
        }
    });
}

async function deleteMeeting(dateStr, index) {
    if (!events[dateStr] || !events[dateStr][index]) return;

    const meeting = events[dateStr][index];
    if (meeting.id) {
        const ok = await deleteEventFromAppwrite(meeting.id);
        if (!ok) {
            showToast('Não foi possível remover o evento do servidor.');
            return;
        }
    }

    events[dateStr].splice(index, 1);
    if (events[dateStr].length === 0) {
        delete events[dateStr];
    }
    renderCalendar();
}

async function goToToday() {
    const today = new Date();
    const newMonth = today.getMonth();
    const newYear = today.getFullYear();

    if (newMonth === currentMonth && newYear === currentYear) return;
    currentMonth = newMonth;
    currentYear = newYear;
    document.getElementById('monthSelect').value = currentMonth;
    await loadMonthEvents(currentYear, currentMonth);
}

async function initAdminApp() {
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('signOutBtn').addEventListener('click', handleSignOut);
    document.getElementById('monthSelect').value = currentMonth;
    document.getElementById('monthSelect').addEventListener('change', async (e) => {
        currentMonth = parseInt(e.target.value, 10);
        await loadMonthEvents(currentYear, currentMonth);
    });
    document.getElementById('todayButton').addEventListener('click', goToToday);

    await restoreSession();
    await loadMonthEvents(currentYear, currentMonth);
}

document.addEventListener('DOMContentLoaded', initAdminApp);
