/* global Web3, TruffleContract */
App = {
  webProvider: null,
  web3: null,
  contracts: {},
  account: "0x0",

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

  initContract: function () {
    $.getJSON("DisasterRecoveryTraining.json", (artifact) => {
      App.contracts.DisasterRecoveryTraining = TruffleContract(artifact);
      App.contracts.DisasterRecoveryTraining.setProvider(App.webProvider);

      console.log("📦 Contract artifact loaded");
      console.log("📦 Available networks:", artifact.networks);

      // Save artifact for debugging
      App.artifact = artifact;

      return App.render();
    });
  },

  render: async function () {
    const loader = $("#loader");
    const content = $("#content");

    console.log("🔄 Entered render()");
    loader.show();
    content.hide();

    // Connect MetaMask account
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        App.account = accounts[0];
        console.log("👛 Connected account:", App.account);
        $("#accountAddress").html(`Connected account: ${App.account}`);
      } catch (error) {
        console.error("❌ MetaMask connection rejected", error);
        $("#accountAddress").html("⚠️ Account not connected in MetaMask");
      }
    }

    let contractInstance;
    try {
      contractInstance = await App.contracts.DisasterRecoveryTraining.deployed();
      console.log("✅ Contract deployed at:", contractInstance.address);
    } catch (err) {
      console.error("❌ Contract not deployed on this network", err);

      // Show helpful debug info in UI
      let networks = Object.keys(App.artifact.networks || {});
      if (networks.length === 0) {
        $("#txStatus").html("⚠️ Contract not deployed to ANY network yet.<br>👉 Run <code>truffle migrate --reset --network development</code>");
      } else {
        $("#txStatus").html(
          `⚠️ Contract not deployed on current network.<br>
          🌐 Current network: 1337<br>
          📦 Available networks in artifact: ${networks.join(", ")}`
        );
      }

      loader.hide();
      content.show();
      return;
    }

    // Attach registration form listener
    if ($("#registrationForm").length > 0) {
      $("#registrationForm").submit(async function (e) {
        e.preventDefault();
        console.log("📩 Registration form submitted");

        const role = $("#role").val();
        const id = $("#id").val().trim();
        const name = $("#name").val().trim();
        const age = parseInt($("#age").val());
        const gender = $("#gender").val();
        const district = $("#district").val();
        const trainingInterest = parseInt($("#trainingInterest").val());

        $("#txStatus").text("⏳ Sending transaction... confirm in MetaMask");

        try {
          if (role === "participant") {
            await contractInstance.registerParticipant(
              id,
              name,
              age,
              gender,
              district,
              trainingInterest,
              { from: App.account }
            );
          } else if (role === "trainer") {
            await contractInstance.registerTrainer(
              id,
              name,
              age,
              gender,
              district,
              { from: App.account }
            );
          } else if (role === "admin") {
            await contractInstance.registerAdminRequest(
              id,
              name,
              age,
              gender,
              district,
              { from: App.account }
            );
          }
          $("#txStatus").text("✅ Registration successful!");
        } catch (err) {
          console.error("❌ Tx error:", err);
          $("#txStatus").text("❌ Error: " + err.message);
        }
      });
    }

    console.log("✅ Finished render()");
    loader.hide();
    content.show();
  },
};

$(function () {
  $(window).on("load", function () {
    App.initWeb();
  });
});

