/* global Web3, TruffleContract */
LoginApp = {
  webProvider: null,
  web3: null,
  contracts: {},
  account: "0x0",

  // ---------------- Init Web3 ----------------
  initWeb: function () {
    const provider = window.ethereum;
    if (provider) {
      this.webProvider = provider;
      this.web3 = new Web3(provider);
    } else {
      this.webProvider = new Web3.providers.HttpProvider("http://127.0.0.1:8545");
      this.web3 = new Web3(this.webProvider);
      $("#txStatus").text("⚠️ No MetaMask found. Using local provider.");
    }
    return this.initContract();
  },

  // ---------------- Load Contract ----------------
  initContract: function () {
    $.getJSON("DisasterRecoveryTraining.json", (artifact) => {
      LoginApp.contracts.DisasterRecoveryTraining = TruffleContract(artifact);
      LoginApp.contracts.DisasterRecoveryTraining.setProvider(LoginApp.webProvider);

      console.log("📦 Contract artifact loaded");
      return LoginApp.render();
    });
  },

  // ---------------- Render ----------------
  render: async function () {
    const loader = $("#loader");
    const content = $("#content");

    loader.show();
    content.hide();

    // connect metamask
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        LoginApp.account = accounts[0];
        $("#accountAddress").html(`Connected account: ${LoginApp.account}`);
      } catch (error) {
        $("#accountAddress").html("⚠️ Account not connected in MetaMask");
      }
    }

    // load contract instance
    let contractInstance;
    try {
      contractInstance = await LoginApp.contracts.DisasterRecoveryTraining.deployed();
      console.log("✅ Contract deployed:", contractInstance.address);
    } catch (err) {
      $("#txStatus").text("⚠️ Contract not deployed on this network.");
      loader.hide();
      content.show();
      return;
    }

    loader.hide();
    content.show();

    // ---------- Detect OWNER ----------
    const contractOwner = await contractInstance.owner.call();
    if (LoginApp.account.toLowerCase() === contractOwner.toLowerCase()) {
      $("#txStatus").text("✅ Logged in as OWNER");
      $("#ownerInfo").show();
      $("#loginForm").hide();

      // --- Load pending Admin Requests ---
      try {
        let html = "<h5>Pending Admin Requests</h5><ul>";
        for (let i = 1; i <= 50; i++) {
          const testId = "A" + String(i).padStart(3, "0");
          try {
            const addr = await contractInstance.getAddressByID(testId);
            if (addr === "0x0000000000000000000000000000000000000000") continue;

            const data = await contractInstance.getParticipantByID(testId);
            const role = data[8];
            if (role.toString() === "3") { // AdminRequest
              html += `<li>${data[1]} (${data[0]}) - ${addr} 
                <button class="approveBtn" data-addr="${addr}">Approve</button></li>`;
            }
          } catch (e) {}
        }
        html += "</ul>";
        $("#adminApprovalSection").show();
        $("#pendingAdmins").html(html);

        $(".approveBtn").click(async function () {
          const targetAddr = $(this).data("addr");
          $("#txStatus").text("⏳ Approving admin...");
          try {
            await contractInstance.approveAdmin(targetAddr, { from: LoginApp.account });
            $("#txStatus").text("✅ Admin approved!");
            $(this).parent().remove();
          } catch (err) {
            console.error(err);
            $("#txStatus").text("❌ Error approving: " + err.message);
          }
        });

      } catch (err) {
        console.error("❌ Failed to load admin requests:", err);
        $("#pendingAdmins").html("<p>❌ Could not load admin requests</p>");
      }
      return;
    }

    // ---------- Handle login form ----------
    $("#loginForm").submit(async function (e) {
      e.preventDefault();

      const loginId = $("#loginId").val().trim();
      if (!loginId) {
        $("#txStatus").text("⚠️ Please enter an ID.");
        return;
      }

      try {
        const userAddr = await contractInstance.getAddressByID(loginId);
        if (userAddr === "0x0000000000000000000000000000000000000000") {
          $("#txStatus").text("⚠️ ID not found.");
          return;
        }
        if (userAddr.toLowerCase() !== LoginApp.account.toLowerCase()) {
          $("#txStatus").text("⚠️ ID does not match connected MetaMask account.");
          return;
        }

        const data = await contractInstance.getParticipantByID(loginId);
        $("#p_id").text(data[0]);
        $("#p_name").text(data[1]);
        $("#p_age").text(data[2]);
        $("#p_gender").text(data[3]);
        $("#p_district").text(data[4]);
        $("#p_interest").text(data[5]);
        $("#p_completed").text(data[7] ? "Yes" : "No");

        $("#userInfo").show();
        $("#bookingSection").show();

        const role = data[8];
        if (role.toString() === "4") { // Admin
          $("#adminPanel").show();

          // --- Load participants into dropdown ---
          try {
            const participants = await contractInstance.getAllParticipants();
            let options = '<option value="">--Select Participant--</option>';
            for (let addr of participants) {
              try {
                const pdata = await contractInstance.participants(addr);
                if (pdata.exists) {
                  options += `<option value="${pdata.id}">${pdata.id} - ${pdata.name} (${pdata.district})</option>`;
                }
              } catch (e) {}
            }
            $("#updateParticipantId").html(options);
          } catch (e) {
            console.error("❌ Failed to load participants:", e);
          }
        }

        await LoginApp.loadBookingOptions(contractInstance);

        $("#txStatus").text(`✅ Logged in as ${loginId}`);
      } catch (err) {
        console.error(err);
        $("#txStatus").text("❌ Login failed: " + err.message);
      }
    });

    // ---------------- Feature 2: Admin Update ----------------
    $("#adminUpdateBtn").click(async function () {
      const pid = $("#updateParticipantId").val().trim();
      const newInterest = $("#newInterest").val();
      const completed = $("#newCompleted").prop("checked");

      $("#txStatus").text("⏳ Sending update...");

      try {
        const userAddr = await contractInstance.getAddressByID(pid);
        if (userAddr === "0x0000000000000000000000000000000000000000") {
          $("#txStatus").text("⚠️ ID not found.");
          return;
        }

        if (newInterest) {
          await contractInstance.updateTrainingInterest(userAddr, parseInt(newInterest), { from: LoginApp.account });
        }
        if (completed) {
          await contractInstance.updateHasCompletedTraining(userAddr, true, { from: LoginApp.account });
        }

        $("#txStatus").text("✅ Update successful!");
      } catch (err) {
        console.error(err);
        $("#txStatus").text("❌ Error updating: " + err.message);
      }
    });

    // ---------------- Feature 4: View Training Schedule ----------------
    $("#viewScheduleBtn").click(async function () {
      $("#scheduleTable").html("⏳ Loading schedule...");
      try {
        const trainers = await contractInstance.getAllTrainers();
        let html = "<h4>Training Schedule</h4><table border='1'><tr><th>Trainer</th><th>Slot Start</th><th>Participant</th></tr>";

        for (let t of trainers) {
          const slots = await contractInstance.getTrainerSlotTimestamps(t);
          for (let s of slots) {
            const booking = await contractInstance.getBookingFields(t, s);
            html += `<tr>
              <td>${t}</td>
              <td>${new Date(parseInt(s) * 1000).toLocaleTimeString()}</td>
              <td>${booking[0]}</td>
            </tr>`;
          }
        }

        html += "</table>";
        $("#scheduleTable").html(html);
      } catch (err) {
        console.error(err);
        $("#scheduleTable").html("❌ Failed to load schedule.");
      }
    });

    // ---------------- Feature 5: Search Participants ----------------
    $("#searchBtn").click(async function () {
      const district = $("#searchDistrict").val().trim();
      $("#searchResult").html("⏳ Searching...");
      try {
        const participants = await contractInstance.getParticipantsByDistrict(district);
        let count = participants.length;

        let html = `<h4>Participants in ${district} (${count})</h4><ul>`;
        for (let addr of participants) {
          const pdata = await contractInstance.participants(addr);
          html += `<li>${pdata.id} - ${pdata.name}</li>`;
        }
        html += "</ul>";

        $("#searchResult").html(html);
      } catch (err) {
        console.error(err);
        $("#searchResult").html("❌ Search failed.");
      }
    });
  },

  // ---------------- Booking Slots Loader ----------------
  loadBookingOptions: async function (contractInstance) {
    $("#trainerSlots").html("⏳ Loading trainers...");

    try {
      const trainers = await contractInstance.getAllTrainers();
      if (trainers.length === 0) {
        $("#trainerSlots").html("⚠️ No trainers available.");
        return;
      }

      const admins = await contractInstance.getAllAdmins();
      if (admins.length === 0) {
        $("#trainerSlots").html("⚠️ No admin available to receive booking fee.");
        return;
      }

      let html = "<table border='1'><tr><th>Trainer</th><th>Slot</th><th>Status</th><th>Admin</th><th>Action</th></tr>";
      const now = Math.floor(Date.now() / 1000);
      const fee = await contractInstance.bookingFee();

      for (let trainer of trainers) {
        for (let i = 0; i < 3; i++) {
          const slotStart = now + i * 1800;
          const alignedSlotStart = slotStart - (slotStart % 1800);
          const available = await contractInstance.isSlotAvailable(trainer, alignedSlotStart);

          let adminSelect = "<select class='adminSelect'>";
          admins.forEach((a) => {
            adminSelect += `<option value="${a}">${a}</option>`;
          });
          adminSelect += "</select>";

          html += `<tr>
            <td>${trainer}</td>
            <td>${new Date(alignedSlotStart * 1000).toLocaleTimeString()}</td>
            <td>${available ? "Available" : "Booked"}</td>
            <td>${adminSelect}</td>
            <td>${available ? `<button class="bookBtn" data-trainer="${trainer}" data-slot="${alignedSlotStart}" data-fee="${fee}">Book</button>` : "-"}</td>
          </tr>`;
        }
      }

      html += "</table>";
      $("#trainerSlots").html(html);

      $(".bookBtn").click(async function () {
        const trainerAddr = $(this).data("trainer");
        const slotStart = $(this).data("slot");
        const fee = $(this).data("fee");
        const adminAddr = $(this).closest("tr").find(".adminSelect").val();

        $("#txStatus").text("⏳ Confirm booking in MetaMask...");
        try {
          await contractInstance.bookSlot(trainerAddr, slotStart, adminAddr, {
            from: LoginApp.account,
            value: fee.toString(),
          });
          $("#txStatus").text("✅ Booking successful!");
          await LoginApp.loadBookingOptions(contractInstance);
        } catch (err) {
          console.error(err);
          $("#txStatus").text("❌ Error booking: " + err.message);
        }
      });
    } catch (err) {
      console.error("❌ Error loading trainer slots:", err);
      $("#trainerSlots").html("❌ Failed to load slots.");
    }
  },
};

// ---------------- Run App ----------------
$(function () {
  $(window).on("load", function () {
    LoginApp.initWeb();
  });
});

