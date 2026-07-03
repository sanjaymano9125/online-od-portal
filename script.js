import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, doc, deleteDoc, query } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 1. Firebase Configuration (Matches your app credentials)
const firebaseConfig = {
    apiKey: "AIzaSyCkD5aElEcwnu-tk2AcaIyMUPTBHGkIExg",
    authDomain: "college-od-portal.firebaseapp.com",
    projectId: "college-od-portal",
    storageBucket: "college-od-portal.firebasestorage.app",
    messagingSenderId: "197136829173",
    appId: "1:197136829173:web:41c9a7683baf362de413bc"
};

// 2. Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

document.addEventListener("DOMContentLoaded", () => {
    const btnAddMember = document.getElementById("btnAddMember");
    const membersContainer = document.getElementById("membersContainer");
    const previewModal = document.getElementById("previewModal");
    const btnCloseModal = document.getElementById("btnCloseModal");
    const odForm = document.getElementById("odForm");

    // ==========================================
    // REASON GRID SELECTION (COLOR HIGHLIGHTING & OTHERS LOGIC)
    // ==========================================
    const reasonItems = document.querySelectorAll('.reason-item');
    const otherReasonContainer = document.getElementById("otherReasonContainer");
    const txtOtherReason = document.getElementById("txtOtherReason");

    reasonItems.forEach(item => {
        item.addEventListener('click', function () {
            reasonItems.forEach(el => el.classList.remove('active-reason'));
            this.classList.add('active-reason');
            const hiddenRadio = this.querySelector('input[type="radio"]');
            
            if (hiddenRadio) {
                hiddenRadio.checked = true;
                
                // Show text box if "Others" is selected, else hide and clear it
                if (hiddenRadio.value === "Others") {
                    otherReasonContainer.style.display = "block";
                    txtOtherReason.required = true;
                } else {
                    otherReasonContainer.style.display = "none";
                    txtOtherReason.required = false;
                    txtOtherReason.value = "";
                }
            }
        });
    });

    // Helper function to extract the final reason
    function getFinalReason() {
        const checkedInput = document.querySelector('input[name="odReason"]:checked');
        let selectedReason = checkedInput ? checkedInput.value : "OD Request";
        
        if (selectedReason === "Others") {
            const customText = txtOtherReason.value.trim();
            selectedReason = customText !== "" ? customText : "Other Reason";
        }
        return selectedReason;
    }

    // ==========================================
    // 1. DYNAMICALLY ADDING A NEW MEMBER ROW
    // ==========================================
    btnAddMember.addEventListener("click", () => {
        const newRow = document.createElement("div");
        newRow.className = "member-row";
        newRow.style = "display: flex; gap: 10px; align-items: center; margin-bottom: 10px; flex-wrap: wrap;";
        
        newRow.innerHTML = `
            <input type="text" class="member-name" placeholder="Full Name" style="flex: 2; min-width: 150px;" required>
            <input type="text" class="member-roll" placeholder="Roll No (e.g., 23EC194)" pattern="\\d{2}[A-Za-z]{2}\\d{3}" title="Format must be: 2 Digits Year + 2 Letters Dept + 3 Digits Roll" style="flex: 1.5; min-width: 130px;" required>
            <select class="member-year" style="flex: 1; min-width: 80px; padding: 8px; border-radius: 4px; border: 1px solid #ccc;" required>
                <option value="" disabled selected>Year</option>
                <option value="I">I</option><option value="II">II</option><option value="III">III</option><option value="IV">IV</option>
            </select>
            <select class="member-section" style="flex: 1; min-width: 80px; padding: 8px; border-radius: 4px; border: 1px solid #ccc;" required>
                <option value="" disabled selected>Sec</option>
                <option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option>
            </select>
            <select class="member-dept" style="flex: 1.5; min-width: 100px; padding: 8px; border-radius: 4px; border: 1px solid #ccc;" required>
                <option value="" disabled selected>Dept</option>
                <option value="Civil">Civil</option><option value="Mechanical">Mechanical</option><option value="EEE">EEE</option><option value="ECE">ECE</option><option value="CSE">CSE</option><option value="IT">IT</option><option value="BME">BME</option><option value="AIDS">AIDS</option><option value="CSBS">CSBS</option><option value="VLSI">VLSI</option><option value="MCA">MCA</option><option value="MBA">MBA</option>
            </select>
            <input type="number" class="member-attendance" step="0.01" min="0" max="100" placeholder="Attd %" style="flex: 1.2; min-width: 90px; padding: 8px; border-radius: 4px; border: 1px solid #ccc;" required>
            <button type="button" class="btn-remove" onclick="removeMember(this)" style="background: none; border: none; color: #e74c3c; cursor: pointer;">
                <span class="material-icons">delete</span>
            </button>
        `;
        membersContainer.appendChild(newRow);
        updateRemoveButtons();
    });

    // ==========================================
    // 3. EXPLICIT CLOUD STORAGE SUBMISSION LOGIC
    // ==========================================
    odForm.addEventListener("submit", async (e) => {
        e.preventDefault(); // Stop standard page reloading behavior

        const rows = document.querySelectorAll(".member-row");
        const membersArray = [];
        let hasShortage = false;

        rows.forEach(row => {
            const attendanceVal = parseFloat(row.querySelector(".member-attendance").value);
            if (attendanceVal < 75.00) {
                hasShortage = true;
            }
            membersArray.push({
                name: row.querySelector(".member-name").value,
                rollNo: row.querySelector(".member-roll").value.toUpperCase(),
                year: row.querySelector(".member-year").value,
                section: row.querySelector(".member-section").value,
                dept: row.querySelector(".member-dept").value,
                attendance: attendanceVal
            });
        });

        // 🛑 BLOCK SUBMISSION IF ATTENDANCE IS INSUFFICIENT
        if (hasShortage) {
            alert("❌ Your OD can't be applied because of insufficient attendance.");
            return; 
        }
        
        // Structure data payload perfectly for Firestore and use the extracted custom reason string
        const odData = {
            fromDate: document.getElementById("fromDate").value,
            toDate: document.getElementById("toDate").value,
            reason: getFinalReason(), // ✨ FIX: Pulls typed reasons instead of just saying "Others"
            coordinatorName: document.getElementById("coordName").value,
            coordinatorDept: document.getElementById("coordDept").value,
            members: membersArray,
            status: "pending", // All valid initial submissions land safely as pending
            timestamp: new Date()
        };

        try {
            // Write directly into Firestore
            await addDoc(collection(db, "od_requests"), odData);
            
            // Show custom notification
            alert("🎉 OD Request Submitted Successfully! It is now streaming live to the Faculty Panel.");
            
            // Clear down the client application state cleanly
            odForm.reset();
            while (membersContainer.children.length > 1) {
                membersContainer.removeChild(membersContainer.lastChild);
            }
            updateRemoveButtons();

            // Hide custom input container
            if (otherReasonContainer) {
                otherReasonContainer.style.display = "none";
            }

        } catch (error) {
            console.error("Database Write Exception Error:", error);
            alert("❌ Database Submission Error: " + error.message);
        }
    });

    btnCloseModal.addEventListener("click", () => {
        previewModal.style.display = "none";
    });
});

window.removeMember = (button) => {
    button.closest(".member-row").remove();
    updateRemoveButtons();
};

function updateRemoveButtons() {
    const rows = document.querySelectorAll(".member-row");
    rows.forEach((row, index) => {
        const removeBtn = row.querySelector(".btn-remove");
        if (index === 0 && rows.length === 1) {
            removeBtn.style.display = "none"; 
        } else {
            removeBtn.style.display = "inline-block";
        }
    });
}

// ==========================================
// 5. LIVE STATUS TRACKER & DYNAMIC GRAPHS
// ==========================================
const trackerContainer = document.getElementById("trackerContainer");

if (trackerContainer) {
    const odCollectionRef = collection(db, "od_requests");
    const trackerQuery = query(odCollectionRef); 

    onSnapshot(trackerQuery, (snapshot) => {
        trackerContainer.innerHTML = "";
        
        // Initialize counters for the graphs
        let totalRequests = snapshot.size;
        let approvedCount = 0;
        let pendingCount = 0;

        // Grab the chart elements from the DOM
        const greenChart = document.querySelector('.chart.green');
        const yellowChart = document.querySelector('.chart.yellow');

        if (snapshot.empty) {
            trackerContainer.innerHTML = "<p style='color: #888; text-align: center; font-size: 0.9rem;'>No past OD requests found.</p>";
            
            // Reset graphs to 0% if database is empty
            if (greenChart) { greenChart.style.setProperty('--percent', 0); greenChart.querySelector('span').innerText = '0%'; }
            if (yellowChart) { yellowChart.style.setProperty('--percent', 0); yellowChart.querySelector('span').innerText = '0%'; }
            return;
        }

        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const docId = docSnap.id;
            const status = (data.status || "pending").toLowerCase();

            // Count the statuses for the math
            if (status === "approved") approvedCount++;
            if (status === "pending") pendingCount++;

            // Build the card using YOUR exact CSS classes
            const card = document.createElement("div");
            card.className = `status-card ${status}`; 
            card.style.cursor = "pointer";
            card.style.display = "flex";
            card.style.alignItems = "center";
            card.style.justifyContent = "space-between";

            let icon = "schedule"; 
            if (status === "approved") icon = "check_circle";
            if (status === "rejected") icon = "cancel";

            card.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span class="material-icons">${icon}</span>
                    <div>
                        <div style="font-weight: 600;">${data.reason || "OD Request"} <span class="status-text" style="font-weight: normal; font-size: 0.85em;">(${status.charAt(0).toUpperCase() + status.slice(1)})</span></div>
                        <div style="font-size: 0.75rem; color: #666; margin-top: 2px;">${data.fromDate || '--'} to ${data.toDate || '--'}</div>
                    </div>
                </div>
                <button class="btn-delete-tracker" title="Delete Request" style="background: none; border: none; color: #e74c3c; cursor: pointer; padding: 5px; display: flex; align-items: center;">
                    <span class="material-icons" style="font-size: 1.2rem;">delete</span>
                </button>
            `;

            card.addEventListener("click", () => {
                openPastRequestModal(data);
            });

            const deleteBtn = card.querySelector(".btn-delete-tracker");
            deleteBtn.addEventListener("click", async (e) => {
                e.stopPropagation(); 
                if (confirm("Are you sure you want to permanently delete this OD request?")) {
                    try {
                        await deleteDoc(doc(db, "od_requests", docId));
                    } catch (error) {
                        console.error("Error deleting document:", error);
                        alert("Failed to delete request. Check permissions.");
                    }
                }
            });

            trackerContainer.appendChild(card);
        });

        // Calculate and Update the Graphs!
        if (totalRequests > 0) {
            const approvedPercent = Math.round((approvedCount / totalRequests) * 100);
            const pendingPercent = Math.round((pendingCount / totalRequests) * 100);

            if (greenChart) {
                greenChart.style.setProperty('--percent', approvedPercent);
                greenChart.querySelector('span').innerText = approvedPercent + '%';
            }
            if (yellowChart) {
                yellowChart.style.setProperty('--percent', pendingPercent);
                yellowChart.querySelector('span').innerText = pendingPercent + '%';
            }
        }
    });
}

// ==========================================
// 6. RENDER THE MODAL FOR SAVED DOCUMENTS
// ==========================================
function openPastRequestModal(data) {
    // Map Firestore data back into the modal UI
    document.getElementById("lblReason").innerText = data.reason || "OD Request";
    // Quick helper function to flip YYYY-MM-DD to DD-MM-YYYY
const formatToDDMMYYYY = (dateStr) => {
    if (!dateStr) return "N/A";
    return dateStr.split('-').reverse().join('-'); 
};

// Map dates using the new format
document.getElementById("lblFromDate").innerText = formatToDDMMYYYY(data.fromDate);
document.getElementById("lblToDate").innerText = formatToDDMMYYYY(data.toDate);
    document.getElementById("lblCoord").innerText = data.coordinatorName || "N/A";
    document.getElementById("lblCoordDept").innerText = data.coordinatorDept || "N/A";
    
    // Use the saved timestamp if available, otherwise use today
    document.getElementById("lblCurrentDate").innerText = data.timestamp 
        ? new Date(data.timestamp.toDate()).toLocaleDateString() 
        : new Date().toLocaleDateString();

    // Repopulate Student Table
    const tableBody = document.getElementById("lblMembersTable");
    tableBody.innerHTML = "";

    if (data.members && Array.isArray(data.members)) {
        data.members.forEach((m, index) => {
            const tableRow = `
                <tr style="border-bottom: 1px solid #ddd;">
                    <td style="padding: 8px;">${index + 1}</td>
                    <td style="padding: 8px;">${m.name}</td>
                    <td style="padding: 8px;">${m.rollNo}</td>
                    <td style="padding: 8px;">${m.year} - ${m.section}</td>
                    <td style="padding: 8px;">${m.dept}</td>
                    <td style="padding: 8px; font-weight: bold; color: ${m.attendance < 75.00 ? '#e74c3c' : '#2ecc71'};">${parseFloat(m.attendance).toFixed(2)}%</td>
                </tr>
            `;
            tableBody.insertAdjacentHTML("beforeend", tableRow);
        });
    }

    // Apply Official Status Stamps
    const approvedSeal = document.getElementById("approvedSeal");
    const rejectedSeal = document.getElementById("rejectedSeal");
    const attendanceNote = document.getElementById("lblAttendanceNote");
    const panelSeals = document.querySelectorAll(".panel-seal");
    const dbStatus = (data.status || "pending").toLowerCase();

    if (dbStatus === "approved") {
        approvedSeal.style.display = "block";
        rejectedSeal.style.display = "none";
        attendanceNote.style.display = "none";
        
        const approvedTextElement = approvedSeal.querySelector('.seal-text');
        if (approvedTextElement) approvedTextElement.innerText = "APPROVED";

        panelSeals.forEach(seal => {
            seal.style.borderColor = "#2ecc71";
            seal.style.color = "#2ecc71";
            seal.querySelector(".seal-icon").innerText = "check_circle";
            seal.querySelector(".seal-text").innerText = "AUTHORIZED";
        });
    } else if (dbStatus === "rejected") {
        approvedSeal.style.display = "none";
        rejectedSeal.style.display = "block";
        
        // Show faculty rejection comments if they left one
        if (data.rejectionReason) {
            attendanceNote.style.display = "block";
            attendanceNote.innerText = `NOTE: ${data.rejectionReason}`;
        } else {
            attendanceNote.style.display = "none";
        }

        panelSeals.forEach(seal => {
            seal.style.borderColor = "#e74c3c";
            seal.style.color = "#e74c3c";
            seal.querySelector(".seal-icon").innerText = "cancel";
            seal.querySelector(".seal-text").innerText = "REJECTED";
        });
    } else {
        // Pending Display
        approvedSeal.style.display = "block";
        rejectedSeal.style.display = "none";
        attendanceNote.style.display = "none";

        const approvedTextElement = approvedSeal.querySelector('.seal-text');
        if (approvedTextElement) approvedTextElement.innerText = "PENDING REVIEW";

        panelSeals.forEach(seal => {
            seal.style.borderColor = "#2a5298";
            seal.style.color = "#2a5298";
            seal.querySelector(".seal-icon").innerText = "hourglass_empty";
            seal.querySelector(".seal-text").innerText = "AWAITING VERIFICATION";
        });
    }

    // Display the modal
    document.getElementById("previewModal").style.display = "block";
}