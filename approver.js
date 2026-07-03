import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, onSnapshot, doc, updateDoc, query, where } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 1. Firebase Configuration (Preserved completely)
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

// 3. Run Pipeline on Load
document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.getElementById('adminRequestsBody');

    if (!tableBody) {
        console.error("Error: Element 'adminRequestsBody' not found.");
        return;
    }

    // ==========================================
    // FILTERED LIVE STREAM (PENDING & Pending)
    // ==========================================
    const odCollectionRef = collection(db, "od_requests");
    
    // FIX: Using the 'in' operator to capture both common casing submissions
    const pendingRequestsQuery = query(
        odCollectionRef, 
        where("status", "in", ["pending", "Pending"])
    );
    
    // Listen to the filtered query live stream
    onSnapshot(pendingRequestsQuery, (snapshot) => {
        console.log(`Database update received. Processing ${snapshot.size} records...`);
        let htmlRows = "";

        if (snapshot.empty) {
            tableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 30px; color: #888;">No applications submitted yet.</td></tr>`;
            return;
        }

        snapshot.forEach((docSnapshot) => {
            const data = docSnapshot.data();
            const docId = docSnapshot.id;

            // Handle parsing the student list cohort display
            let membersDisplay = "No members registered";
            if (data.members && Array.isArray(data.members)) {
                membersDisplay = data.members.map(m => `• ${m.name} (${m.rollNo || m.roll})`).join("<br>");
            }

            // Normalize structural casing options safely
            const currentStatus = (data.status || 'pending').toLowerCase();
            
            // Generate clean badges using your stylesheet's exact structural definitions
            let statusBadgeHTML = `<span class="badge pending">Pending</span>`;
            if (currentStatus === 'approved') statusBadgeHTML = `<span class="badge approved">Approved</span>`;
            if (currentStatus === 'rejected') statusBadgeHTML = `<span class="badge rejected">Rejected</span>`;

            // Setup action layouts matching your exact .action-btn design rules
            let actionsHTML = `
                <span style="color: #2ecc71; font-weight: bold; display: inline-flex; align-items: center; gap: 4px;">
                    <span class="material-icons" style="font-size: 1.2rem;">check_circle</span> Authorized
                </span>`;
            
            if (currentStatus === "pending") {
                actionsHTML = `
                    <div class="action-group">
                        <button class="action-btn approve approve-btn" data-id="${docId}">
                            <span class="material-icons" style="font-size: 1rem;">check</span> Approve
                        </button>
                        <button class="action-btn reject reject-btn" data-id="${docId}">
                            <span class="material-icons" style="font-size: 1rem;">close</span> Reject
                        </button>
                    </div>
                `;
            }

            htmlRows += `
                <tr>
                    <td><strong>${data.fromDate || 'N/A'}</strong> <br>to<br> <strong>${data.toDate || 'N/A'}</strong></td>
                    <td><span style="color:#2a5298; font-weight:600;">${data.reason || 'OD Request'}</span></td>
                    <td><div class="members-list-cell">${membersDisplay}</div></td>
                    <td>${statusBadgeHTML}</td>
                    <td>${actionsHTML}</td>
                </tr>
            `;
        });

        tableBody.innerHTML = htmlRows;

        // ==========================================
        // ATTACH CLICK LISTENERS FOR APPROVAL
        // ==========================================
        const approveButtons = document.querySelectorAll('.approve-btn');
        approveButtons.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                try {
                    const docRef = doc(db, "od_requests", id);
                    await updateDoc(docRef, { 
                        status: "Approved" 
                    });
                    alert("OD Record Approved successfully!");
                } catch (err) {
                    console.error("Failed to update status: ", err);
                    alert("Write operation rejected. Check Firebase Security Rules.");
                }
            });
        });

        // ==========================================
        // ATTACH CLICK LISTENERS FOR REJECTION
        // ==========================================
        const rejectButtons = document.querySelectorAll('.reject-btn');
        rejectButtons.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                
                // Interactively collect feedback text
                const feedback = prompt("Enter an optional comment or reason for rejecting this OD request:");
                if (feedback === null) return; // Cancel operation if prompt is closed
                
                const rejectionReasonText = feedback.trim() || "Rejected by Faculty Administration";

                try {
                    const docRef = doc(db, "od_requests", id);
                    await updateDoc(docRef, { 
                        status: "Rejected",
                        rejectionReason: rejectionReasonText
                    });
                    alert("OD Record Rejected.");
                } catch (err) {
                    console.error("Failed to execute rejection write logic: ", err);
                    alert("Write operation rejected. Check Firebase Security Rules.");
                }
            });
        });

    }, (error) => {
        console.error("Live streaming pipeline error:", error);
        tableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: red;">Connection failed: ${error.message}</td></tr>`;
    });
});