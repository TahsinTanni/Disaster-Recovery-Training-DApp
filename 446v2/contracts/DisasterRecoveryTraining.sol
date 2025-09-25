// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.7.0 <0.9.0;

contract DisasterRecoveryTraining {
    uint256 public constant SLOT_DURATION = 30 * 60; // 30 minutes
    uint256 public bookingFee; // fixed booking fee (wei)

    address public owner;

    enum TrainingInterest { None, FirstAid, ShelterRebuild, FoodSafety } // 0 = None
    enum Role { None, Participant, Trainer, AdminRequest, Admin }

    struct Participant {
        string id;
        string name;
        uint8 age;
        string gender;
        string district;
        TrainingInterest trainingInterest;
        bool exists;
        bool hasCompletedTraining;
    }

    struct Booking {
        address participant;
        address trainer;
        uint256 slotStart;
        uint256 slotEnd;
    }

    // --------- State ----------
    mapping(address => Role) public roles;
    mapping(address => Participant) public participants;

    mapping(address => mapping(uint256 => Booking)) private bookings; // trainer => slotStart => Booking
    mapping(address => uint256[]) private trainerBookedSlots; // trainer => list of slotStart

    mapping(string => bool) private usedIDs;
    address[] private allTrainers;

    address[] private allParticipants;
    mapping(string => uint256) public districtCount;

    mapping(address => mapping(TrainingInterest => bool)) public trainingCompletion;

    mapping(string => address) public idToAddress;

    // NEW: keep track of admins
    address[] private allAdmins;

    // --------- Events ---------
    event Registered(address indexed user, Role role);
    event AdminApproved(address indexed account);
    event ParticipantUpdated(address indexed participantAddr, string fieldUpdated);
    event SlotBooked(address indexed participant, address indexed trainer, uint256 slotStart);
    event BookingFeeChanged(uint256 newFee);

    // --------- Modifiers -------
    modifier onlyOwner() {
        require(msg.sender == owner, "owner only");
        _;
    }
    modifier onlyAdmin() {
        require(roles[msg.sender] == Role.Admin, "admin only");
        _;
    }
    modifier onlyParticipant() {
        require(roles[msg.sender] == Role.Participant, "participant only");
        _;
    }
    modifier onlyTrainer() {
        require(roles[msg.sender] == Role.Trainer, "trainer only");
        _;
    }

    // --------- Constructor -----
    constructor(uint256 _bookingFeeWei) {
        owner = msg.sender;
        bookingFee = _bookingFeeWei;
        roles[msg.sender] = Role.Admin;
        allAdmins.push(msg.sender); // store deployer as first admin
        emit Registered(msg.sender, Role.Admin);
        emit AdminApproved(msg.sender);
    }

    // --------- Internals --------
    function _toTrainingInterest(uint8 v) internal pure returns (TrainingInterest) {
        require(v >= 1 && v <= 3, "invalid training interest value");
        if (v == 1) return TrainingInterest.FirstAid;
        if (v == 2) return TrainingInterest.ShelterRebuild;
        return TrainingInterest.FoodSafety;
    }

    function _validateID(string memory _id, Role role) internal pure {
        bytes memory b = bytes(_id);
        require(b.length >= 4, "ID too short");
        bytes1 prefix = b[0];
        if (role == Role.Participant) {
            require(prefix == "P", "Participant ID must start with P");
        } else if (role == Role.Trainer) {
            require(prefix == "T", "Trainer ID must start with T");
        } else if (role == Role.AdminRequest || role == Role.Admin) {
            require(prefix == "A", "Admin ID must start with A");
        }
    }

    function _validateGender(string calldata _gender) internal pure {
        require(
            keccak256(bytes(_gender)) == keccak256(bytes("Male")) ||
            keccak256(bytes(_gender)) == keccak256(bytes("Female")),
            "invalid gender"
        );
    }

    // --------- Registration -----
    function registerParticipant(
        string calldata _id,
        string calldata _name,
        uint8 _age,
        string calldata _gender,
        string calldata _district,
        uint8 _trainingInterest
    ) external {
        require(roles[msg.sender] == Role.None, "address already registered");
        require(!usedIDs[_id], "ID already used");

        _validateID(_id, Role.Participant);
        _validateGender(_gender);

        TrainingInterest ti = _toTrainingInterest(_trainingInterest);

        participants[msg.sender] = Participant({
            id: _id,
            name: _name,
            age: _age,
            gender: _gender,
            district: _district,
            trainingInterest: ti,
            exists: true,
            hasCompletedTraining: false
        });

        trainingCompletion[msg.sender][TrainingInterest.FirstAid] = false;
        trainingCompletion[msg.sender][TrainingInterest.ShelterRebuild] = false;
        trainingCompletion[msg.sender][TrainingInterest.FoodSafety] = false;

        roles[msg.sender] = Role.Participant;
        usedIDs[_id] = true;
        idToAddress[_id] = msg.sender;

        allParticipants.push(msg.sender);
        districtCount[_district] += 1;

        emit Registered(msg.sender, Role.Participant);
    }

    function registerTrainer(
        string calldata _id,
        string calldata _name,
        uint8 _age,
        string calldata _gender,
        string calldata _district
    ) external {
        require(roles[msg.sender] == Role.None, "address already registered");
        require(!usedIDs[_id], "ID already used");

        _validateID(_id, Role.Trainer);
        _validateGender(_gender);

        participants[msg.sender] = Participant({
            id: _id,
            name: _name,
            age: _age,
            gender: _gender,
            district: _district,
            trainingInterest: TrainingInterest.None,
            exists: true,
            hasCompletedTraining: false
        });

        roles[msg.sender] = Role.Trainer;
        usedIDs[_id] = true;
        idToAddress[_id] = msg.sender;

        allTrainers.push(msg.sender);

        emit Registered(msg.sender, Role.Trainer);
    }

    function registerAdminRequest(
        string calldata _id,
        string calldata _name,
        uint8 _age,
        string calldata _gender,
        string calldata _district
    ) external {
        require(roles[msg.sender] == Role.None, "address already registered");
        require(!usedIDs[_id], "ID already used");

        _validateID(_id, Role.AdminRequest);
        _validateGender(_gender);

        participants[msg.sender] = Participant({
            id: _id,
            name: _name,
            age: _age,
            gender: _gender,
            district: _district,
            trainingInterest: TrainingInterest.None,
            exists: true,
            hasCompletedTraining: false
        });

        roles[msg.sender] = Role.AdminRequest;
        usedIDs[_id] = true;
        idToAddress[_id] = msg.sender;

        emit Registered(msg.sender, Role.AdminRequest);
    }

    function approveAdmin(address account) external onlyOwner {
        roles[account] = Role.Admin;
        allAdmins.push(account); // add to list
        emit AdminApproved(account);
    }

    // --------- Admin updates ----
    function updateTrainingInterest(address participantAddr, uint8 newInterest) external onlyAdmin {
        require(participants[participantAddr].exists, "participant not found");
        TrainingInterest ti = _toTrainingInterest(newInterest);
        require(!trainingCompletion[participantAddr][ti], "cannot set completed training as new interest");
        participants[participantAddr].trainingInterest = ti;
        emit ParticipantUpdated(participantAddr, "trainingInterest");
    }

    function updateHasCompletedTraining(address participantAddr, bool completed) external onlyAdmin {
        require(participants[participantAddr].exists, "participant not found");
        TrainingInterest currentInterest = participants[participantAddr].trainingInterest;

        if (trainingCompletion[participantAddr][currentInterest]) {
            require(completed == true, "cannot revert completed to false");
        } else if (completed) {
            trainingCompletion[participantAddr][currentInterest] = true;
            participants[participantAddr].hasCompletedTraining = true;
        }
        emit ParticipantUpdated(participantAddr, "hasCompletedTraining");
    }

    // --------- Booking ----------
    function bookSlot(address trainer, uint256 slotStart, address adminRecipient)
        external
        payable
        onlyParticipant
    {
        require(roles[trainer] == Role.Trainer, "target is not trainer");
        require(slotStart > block.timestamp - 1, "slot must be in future or now");
        require(msg.value == bookingFee, "incorrect booking fee");
        require(roles[adminRecipient] == Role.Admin, "recipient must be an approved admin");
        require(slotStart % SLOT_DURATION == 0, "slot start must align to 30-min interval");
        require(bookings[trainer][slotStart].participant == address(0), "slot already booked");

        bookings[trainer][slotStart] = Booking({
            participant: msg.sender,
            trainer: trainer,
            slotStart: slotStart,
            slotEnd: slotStart + SLOT_DURATION - 1
        });
        trainerBookedSlots[trainer].push(slotStart);

        (bool ok, ) = payable(adminRecipient).call{value: msg.value}("");
        require(ok, "fee transfer failed");

        emit SlotBooked(msg.sender, trainer, slotStart);
    }

    // --------- Views ----------
    function getTrainerSlotTimestamps(address trainer) external view returns (uint256[] memory) {
        return trainerBookedSlots[trainer];
    }

    function getBookingFields(address trainer, uint256 slotStart)
        external
        view
        returns (address participant, address _trainer, uint256 _slotStart, uint256 _slotEnd)
    {
        Booking memory b = bookings[trainer][slotStart];
        return (b.participant, b.trainer, b.slotStart, b.slotEnd);
    }

    function isSlotAvailable(address trainer, uint256 slotStart) external view returns (bool) {
        return bookings[trainer][slotStart].participant == address(0);
    }

    function getAllTrainers() external view returns (address[] memory) {
        return allTrainers;
    }

    function getAllParticipants() external view returns (address[] memory) {
        return allParticipants;
    }

    function getParticipantsByDistrict(string calldata district) external view returns (address[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < allParticipants.length; i++) {
            if (keccak256(bytes(participants[allParticipants[i]].district)) == keccak256(bytes(district))) {
                count++;
            }
        }
        address[] memory result = new address[](count);
        uint256 idx = 0;
        for (uint256 i = 0; i < allParticipants.length; i++) {
            if (keccak256(bytes(participants[allParticipants[i]].district)) == keccak256(bytes(district))) {
                result[idx++] = allParticipants[i];
            }
        }
        return result;
    }

    function setBookingFee(uint256 newFeeWei) external onlyOwner {
        bookingFee = newFeeWei;
        emit BookingFeeChanged(newFeeWei);
    }

    // NEW: admin list getter
    function getAllAdmins() external view returns (address[] memory) {
        return allAdmins;
    }

    function isIDUsed(string calldata _id) external view returns (bool) {
        return usedIDs[_id];
    }

    function getAddressByID(string calldata _id) external view returns (address) {
        return idToAddress[_id];
    }

    function getParticipantByID(string calldata _id)
        external
        view
        returns (
            string memory id_,
            string memory name,
            uint8 age,
            string memory gender,
            string memory district,
            TrainingInterest trainingInterest,
            bool exists,
            bool hasCompletedTraining,
            Role role,
            address account
        )
    {
        address a = idToAddress[_id];
        require(a != address(0), "id not found");
        Participant memory p = participants[a];
        return (
            p.id,
            p.name,
            p.age,
            p.gender,
            p.district,
            p.trainingInterest,
            p.exists,
            p.hasCompletedTraining,
            roles[a],
            a
        );
    }

    receive() external payable {
        revert("direct sends not allowed");
    }
    fallback() external payable {
        revert("not supported");
    }
}

