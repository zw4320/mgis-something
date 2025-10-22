// Course data will be loaded from rit_courses.json
let coursesData = [];
let mySchedule = [];
let currentFilter = 'All';

// Time slots for courses (realistic university schedule)
const timeSlots = [
    { days: 'MW', time: '8:00 AM - 9:15 AM', start: 800, end: 915 },
    { days: 'MW', time: '9:30 AM - 10:45 AM', start: 930, end: 1045 },
    { days: 'MW', time: '11:00 AM - 12:15 PM', start: 1100, end: 1215 },
    { days: 'MW', time: '12:30 PM - 1:45 PM', start: 1230, end: 1345 },
    { days: 'MW', time: '2:00 PM - 3:15 PM', start: 1400, end: 1515 },
    { days: 'MW', time: '3:30 PM - 4:45 PM', start: 1530, end: 1645 },
    { days: 'TR', time: '8:00 AM - 9:15 AM', start: 800, end: 915 },
    { days: 'TR', time: '9:30 AM - 10:45 AM', start: 930, end: 1045 },
    { days: 'TR', time: '11:00 AM - 12:15 PM', start: 1100, end: 1215 },
    { days: 'TR', time: '12:30 PM - 1:45 PM', start: 1230, end: 1345 },
    { days: 'TR', time: '2:00 PM - 3:15 PM', start: 1400, end: 1515 },
    { days: 'TR', time: '3:30 PM - 4:45 PM', start: 1530, end: 1645 },
    { days: 'F', time: '9:00 AM - 11:45 AM', start: 900, end: 1145 },
    { days: 'F', time: '12:00 PM - 2:45 PM', start: 1200, end: 1445 },
];

// Assign random but consistent time slots to courses
function assignTimeSlots(courses) {
    return courses.map(course => {
        // Use course code to generate consistent random index
        const hash = course.courseCode.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const timeSlot = timeSlots[hash % timeSlots.length];
        return {
            ...course,
            schedule: timeSlot
        };
    });
}

// Load courses from JSON file
async function loadCourses() {
    try {
        const response = await fetch('rit_courses.json');
        const data = await response.json();
        coursesData = assignTimeSlots(data.courses);
        initializeApp();
    } catch (error) {
        console.error('Error loading courses:', error);
        document.getElementById('courseList').innerHTML = 
            '<div class="no-courses">Error loading courses. Please make sure rit_courses.json is in the same folder.</div>';
    }
}

// Initialize the application
function initializeApp() {
    createFilterButtons();
    displayCourses(coursesData);
    setupEventListeners();
}

// Extract unique departments from courses
function getDepartments() {
    const departments = [...new Set(coursesData.map(course => course.department))];
    return departments.sort();
}

// Create filter buttons
function createFilterButtons() {
    const filterControls = document.getElementById('filterControls');
    const departments = getDepartments();
    
    // Add "All" button
    const allBtn = document.createElement('button');
    allBtn.className = 'filter-btn active';
    allBtn.textContent = 'All Courses';
    allBtn.onclick = () => filterCourses('All');
    filterControls.appendChild(allBtn);
    
    // Add department buttons
    departments.forEach(dept => {
        const btn = document.createElement('button');
        btn.className = 'filter-btn';
        btn.textContent = dept;
        btn.onclick = () => filterCourses(dept);
        filterControls.appendChild(btn);
    });
}

// Filter courses by department
function filterCourses(department) {
    currentFilter = department;
    
    // Update active button
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent === department || (department === 'All' && btn.textContent === 'All Courses')) {
            btn.classList.add('active');
        }
    });
    
    // Filter and display courses
    const filteredCourses = department === 'All' 
        ? coursesData 
        : coursesData.filter(course => course.department === department);
    
    displayCourses(filteredCourses);
}

// Display courses in the list
function displayCourses(courses) {
    const courseList = document.getElementById('courseList');
    
    if (courses.length === 0) {
        courseList.innerHTML = '<div class="no-courses">No courses found for this department.</div>';
        return;
    }
    
    courseList.innerHTML = courses.map(course => `
        <div class="course-card" onclick="showCourseDetails('${course.id}')">
            <div class="course-header">
                <div class="course-code">${course.courseCode}</div>
                <div class="course-credits">${course.credits} CR</div>
            </div>
            <div class="course-title">${course.title}</div>
            <div class="course-department">${course.department}</div>
        </div>
    `).join('');
}

// Check if prerequisites are met
function checkPrerequisites(course) {
    if (course.prerequisites.length === 0) {
        return { met: true, missing: [] };
    }
    
    const scheduledCourseCodes = mySchedule.map(c => c.courseCode);
    const missingPrereqs = course.prerequisites.filter(prereq => !scheduledCourseCodes.includes(prereq));
    
    return {
        met: missingPrereqs.length === 0,
        missing: missingPrereqs
    };
}

// Check for time conflicts
function hasTimeConflict(newCourse) {
    for (let scheduledCourse of mySchedule) {
        // Check if days overlap
        const newDays = newCourse.schedule.days.split('');
        const scheduledDays = scheduledCourse.schedule.days.split('');
        const daysOverlap = newDays.some(day => scheduledDays.includes(day));
        
        if (daysOverlap) {
            // Check if times overlap
            const newStart = newCourse.schedule.start;
            const newEnd = newCourse.schedule.end;
            const schedStart = scheduledCourse.schedule.start;
            const schedEnd = scheduledCourse.schedule.end;
            
            const timeOverlap = (newStart < schedEnd && newEnd > schedStart);
            
            if (timeOverlap) {
                return {
                    conflict: true,
                    conflictWith: scheduledCourse
                };
            }
        }
    }
    
    return { conflict: false };
}

// Show course details in modal
function showCourseDetails(courseId) {
    const course = coursesData.find(c => c.id === courseId);
    if (!course) return;
    
    const isInSchedule = mySchedule.some(c => c.id === courseId);
    const prereqCheck = checkPrerequisites(course);
    const conflictCheck = hasTimeConflict(course);
    
    let validationMessage = '';
    let canAdd = !isInSchedule;
    
    if (!prereqCheck.met) {
        canAdd = false;
        validationMessage = `
            <div class="modal-section validation-warning">
                <div class="modal-section-title">⚠️ Prerequisites Not Met</div>
                <div class="modal-section-content">
                    You must complete these courses first: <strong>${prereqCheck.missing.join(', ')}</strong>
                </div>
            </div>
        `;
    }
    
    if (conflictCheck.conflict && !isInSchedule) {
        canAdd = false;
        validationMessage += `
            <div class="modal-section validation-error">
                <div class="modal-section-title">🚫 Time Conflict</div>
                <div class="modal-section-content">
                    This course conflicts with <strong>${conflictCheck.conflictWith.courseCode}</strong> 
                    (${conflictCheck.conflictWith.schedule.days} ${conflictCheck.conflictWith.schedule.time})
                </div>
            </div>
        `;
    }
    
    const modalBody = document.getElementById('modalBody');
    modalBody.innerHTML = `
        <div class="modal-course-code">${course.courseCode}</div>
        <div class="modal-course-title">${course.title}</div>
        
        <div class="modal-section">
            <div class="modal-section-title">📋 Course Information</div>
            <div class="modal-section-content">
                <span class="badge badge-department">${course.department}</span>
                <span class="badge badge-department">${course.credits} Credits</span>
                <span class="badge badge-department">Level ${course.level}</span>
            </div>
        </div>
        
        <div class="modal-section">
            <div class="modal-section-title">🕐 Schedule</div>
            <div class="modal-section-content">
                <span class="badge badge-term">${course.schedule.days}</span>
                <span class="badge badge-term">${course.schedule.time}</span>
            </div>
        </div>
        
        <div class="modal-section">
            <div class="modal-section-title">📖 Description</div>
            <div class="modal-section-content">${course.description}</div>
        </div>
        
        <div class="modal-section">
            <div class="modal-section-title">📚 Prerequisites</div>
            <div class="modal-section-content">
                ${course.prerequisites.length > 0 
                    ? course.prerequisites.join(', ') 
                    : 'None'}
            </div>
        </div>
        
        <div class="modal-section">
            <div class="modal-section-title">📅 Terms Offered</div>
            <div class="modal-section-content">
                ${course.terms.map(term => `<span class="badge badge-term">${term}</span>`).join('')}
            </div>
        </div>
        
        ${validationMessage}
        
        <button class="add-to-schedule-btn" 
                onclick="addToSchedule('${course.id}')"
                ${!canAdd ? 'disabled' : ''}>
            ${isInSchedule ? '✓ Already in Schedule' : canAdd ? '+ Add to My Schedule' : '✗ Cannot Add to Schedule'}
        </button>
    `;
    
    document.getElementById('courseModal').classList.add('active');
}

// Add course to schedule
function addToSchedule(courseId) {
    const course = coursesData.find(c => c.id === courseId);
    if (!course) return;
    
    // Check if already in schedule
    if (mySchedule.some(c => c.id === courseId)) {
        return;
    }
    
    // Check prerequisites
    const prereqCheck = checkPrerequisites(course);
    if (!prereqCheck.met) {
        alert(`Cannot add course. Missing prerequisites: ${prereqCheck.missing.join(', ')}`);
        return;
    }
    
    // Check time conflicts
    const conflictCheck = hasTimeConflict(course);
    if (conflictCheck.conflict) {
        alert(`Cannot add course. Time conflict with ${conflictCheck.conflictWith.courseCode} (${conflictCheck.conflictWith.schedule.days} ${conflictCheck.conflictWith.schedule.time})`);
        return;
    }
    
    mySchedule.push(course);
    updateScheduleDisplay();
    
    // Close modal and show feedback
    document.getElementById('courseModal').classList.remove('active');
    
    // Update the button in case modal is reopened
    setTimeout(() => {
        if (document.getElementById('courseModal').classList.contains('active')) {
            showCourseDetails(courseId);
        }
    }, 300);
}

// Remove course from schedule
function removeFromSchedule(courseId) {
    mySchedule = mySchedule.filter(c => c.id !== courseId);
    updateScheduleDisplay();
}

// Update schedule display
function updateScheduleDisplay() {
    const scheduleContent = document.getElementById('scheduleContent');
    const totalCreditsDiv = document.getElementById('totalCredits');
    const creditsCount = document.getElementById('creditsCount');
    
    if (mySchedule.length === 0) {
        scheduleContent.innerHTML = '<div class="schedule-empty">Add courses to build your schedule</div>';
        totalCreditsDiv.style.display = 'none';
        return;
    }
    
    scheduleContent.innerHTML = mySchedule.map(course => `
        <div class="schedule-item">
            <div class="schedule-item-header">
                <div class="schedule-item-code">${course.courseCode}</div>
                <div class="schedule-item-credits">${course.credits} CR</div>
            </div>
            <div class="schedule-item-title">${course.title}</div>
            <div class="schedule-time">${course.schedule.days} ${course.schedule.time}</div>
            <button class="remove-btn" onclick="removeFromSchedule('${course.id}')">Remove</button>
        </div>
    `).join('');
    
    // Calculate total credits
    const totalCredits = mySchedule.reduce((sum, course) => sum + course.credits, 0);
    creditsCount.textContent = totalCredits;
    totalCreditsDiv.style.display = 'block';
}

// Setup event listeners
function setupEventListeners() {
    // Close modal button
    document.getElementById('closeModal').addEventListener('click', () => {
        document.getElementById('courseModal').classList.remove('active');
    });
    
    // Close modal when clicking outside
    document.getElementById('courseModal').addEventListener('click', (e) => {
        if (e.target.id === 'courseModal') {
            document.getElementById('courseModal').classList.remove('active');
        }
    });
    
    // Close modal on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.getElementById('courseModal').classList.remove('active');
        }
    });
}

// Load courses when page loads
loadCourses();