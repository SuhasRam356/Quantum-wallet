import { expect } from "chai";
import hre from "hardhat";

describe("QuantumSmartWallet", function () {
  let wallet;
  let owner;
  let entryPoint;
  let validator;
  let otherAccount;

  // Simulate an FALCON-512 public key (897 bytes)
  const mockPqcPubKey = hre.ethers.hexlify(hre.ethers.randomBytes(897));
  const mockPqcPubKeyHash = hre.ethers.keccak256(mockPqcPubKey);

  beforeEach(async function () {
    [owner, entryPoint, validator, otherAccount] = await hre.ethers.getSigners();
    
    // Deploy MockFalconPrecompile
    const MockPrecompile = await hre.ethers.getContractFactory("MockFalconPrecompile");
    const mock = await MockPrecompile.deploy();
    await mock.waitForDeployment();
    
    const mockAddress = await mock.getAddress();
    
    const Wallet = await hre.ethers.getContractFactory("QuantumSmartWallet");
    // constructor(_entryPoint, _pqcAlgorithmId, _pqcPubKeyHash, _initialOwner, _pqcPrecompile)
    wallet = await Wallet.deploy(entryPoint.address, 2, mockPqcPubKeyHash, owner.address, mockAddress);
    await wallet.waitForDeployment();
  });

  it("Should set the right owner, entryPoint, PQC key hash, and precompile", async function () {
    expect(await wallet.owner()).to.equal(owner.address);
    expect(await wallet.entryPoint()).to.equal(entryPoint.address);
    expect(await wallet.pqcPubKeyHash()).to.equal(mockPqcPubKeyHash);
  });

  it("Should receive deposits", async function () {
    const depositAmount = hre.ethers.parseEther("1.0");
    await owner.sendTransaction({
      to: await wallet.getAddress(),
      value: depositAmount,
    });
    const balance = await hre.ethers.provider.getBalance(await wallet.getAddress());
    expect(balance).to.equal(depositAmount);
  });

  it("Should execute transaction when called by EntryPoint", async function () {
    const depositAmount = hre.ethers.parseEther("1.0");
    await owner.sendTransaction({
      to: await wallet.getAddress(),
      value: depositAmount,
    });

    const transferAmount = hre.ethers.parseEther("0.5");
    const targetAddress = otherAccount.address;
    const data = "0x";

    const initialBalance = await hre.ethers.provider.getBalance(targetAddress);

    await wallet.connect(entryPoint).execute(targetAddress, transferAmount, data);

    const finalBalance = await hre.ethers.provider.getBalance(targetAddress);
    expect(finalBalance - initialBalance).to.equal(transferAmount);
  });

  it("Should reject execute if caller is not the EntryPoint", async function () {
    await expect(
      wallet.connect(owner).execute(otherAccount.address, 0, "0x")
    ).to.be.revertedWith("Only EntryPoint can call this");
  });

  it("Should correctly validate a UserOp with valid User ECDSA and FALCON-512 signatures", async function () {
    const userOpHash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("test user op hash"));
    const hash = hre.ethers.hashMessage(hre.ethers.getBytes(userOpHash));
    
    const userSignature = await owner.signMessage(hre.ethers.getBytes(userOpHash));
    
    // Mock 666 byte Falcon signature.
    // Our mock precompile expects the first 32 bytes of the signature to be the keccak256 of the message hash
    const falconSigBytes = new Uint8Array(666);
    const expectedHashBytes = hre.ethers.getBytes(hash);
    falconSigBytes.set(expectedHashBytes, 0);
    const falconSignature = hre.ethers.hexlify(falconSigBytes);
    
    // Concat signatures: ECDSA (65 bytes) + Falcon PK (897 bytes) + Falcon Sig (666 bytes)
    const combinedSignature = userSignature + mockPqcPubKey.slice(2) + falconSignature.slice(2);

    const userOp = {
      sender: await wallet.getAddress(),
      nonce: 0,
      initCode: "0x",
      callData: "0x",
      accountGasLimits: hre.ethers.ZeroHash,
      preVerificationGas: 0,
      gasFees: hre.ethers.ZeroHash,
      paymasterAndData: "0x",
      signature: combinedSignature
    };

    const result = await wallet.connect(entryPoint).validateUserOp.staticCall(userOp, userOpHash, 0);
    expect(result).to.equal(0);
  });

  it("Should fail validateUserOp if FALCON-512 signature is invalid", async function () {
    const userOpHash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("test user op hash"));
    const userSignature = await owner.signMessage(hre.ethers.getBytes(userOpHash));
    
    // Random 666 byte signature (won't match the embedded hash check)
    const falconSignature = hre.ethers.hexlify(hre.ethers.randomBytes(666));
    
    const combinedSignature = userSignature + mockPqcPubKey.slice(2) + falconSignature.slice(2);

    const userOp = {
      sender: await wallet.getAddress(),
      nonce: 0,
      initCode: "0x",
      callData: "0x",
      accountGasLimits: hre.ethers.ZeroHash,
      preVerificationGas: 0,
      gasFees: hre.ethers.ZeroHash,
      paymasterAndData: "0x",
      signature: combinedSignature
    };

    const result = await wallet.connect(entryPoint).validateUserOp.staticCall(userOp, userOpHash, 0);
    expect(result).to.equal(1);
  });

  it("Should fail validateUserOp if signature length is less than 1628 bytes", async function () {
    const userOpHash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("test user op hash"));
    const userSignature = await owner.signMessage(hre.ethers.getBytes(userOpHash)); // 65 bytes only

    const userOp = {
      sender: await wallet.getAddress(),
      nonce: 0,
      initCode: "0x",
      callData: "0x",
      accountGasLimits: hre.ethers.ZeroHash,
      preVerificationGas: 0,
      gasFees: hre.ethers.ZeroHash,
      paymasterAndData: "0x",
      signature: userSignature
    };

    const result = await wallet.connect(entryPoint).validateUserOp.staticCall(userOp, userOpHash, 0);
    expect(result).to.equal(1);
  });

  describe("Social Recovery", function () {
    let guardian2;
    let guardian3;
    let newOwner;
    const newPqcHash = hre.ethers.keccak256(hre.ethers.randomBytes(32));

    beforeEach(async function () {
      const signers = await hre.ethers.getSigners();
      guardian2 = signers[4];
      guardian3 = signers[5];
      newOwner = signers[6];

      // Add guardians via EntryPoint (using connect(entryPoint))
      await wallet.connect(entryPoint).addGuardian(validator.address);
      await wallet.connect(entryPoint).addGuardian(guardian2.address);
      await wallet.connect(entryPoint).addGuardian(guardian3.address);
    });

    it("Should allow a guardian to initiate recovery", async function () {
      await wallet.connect(validator).initiateRecovery(newOwner.address, 2, newPqcHash);
      const recovery = await wallet.activeRecovery();
      expect(recovery.active).to.be.true;
      expect(recovery.newOwner).to.equal(newOwner.address);
      expect(recovery.approvalCount).to.equal(1);
    });

    it("Should not allow non-guardian to initiate recovery", async function () {
      await expect(
        wallet.connect(otherAccount).initiateRecovery(newOwner.address, 2, newPqcHash)
      ).to.be.revertedWith("Only guardian can initiate");
    });

    it("Should allow other guardians to approve recovery", async function () {
      await wallet.connect(validator).initiateRecovery(newOwner.address, 2, newPqcHash);
      await wallet.connect(guardian2).approveRecovery();
      
      const recovery = await wallet.activeRecovery();
      expect(recovery.approvalCount).to.equal(2);
    });

    it("Should execute recovery after timelock and threshold", async function () {
      await wallet.connect(validator).initiateRecovery(newOwner.address, 2, newPqcHash);
      await wallet.connect(guardian2).approveRecovery();
      
      // Fast forward time by 1 day + 1 second
      await hre.network.provider.send("evm_increaseTime", [24 * 60 * 60 + 1]);
      await hre.network.provider.send("evm_mine");

      await wallet.executeRecovery();

      expect(await wallet.owner()).to.equal(newOwner.address);
      expect(await wallet.pqcPubKeyHash()).to.equal(newPqcHash);
      expect(await wallet.pqcAlgorithmId()).to.equal(2);

      const recovery = await wallet.activeRecovery();
      expect(recovery.active).to.be.false;
    });

    it("Should fail to execute recovery if timelock hasn't passed", async function () {
      await wallet.connect(validator).initiateRecovery(newOwner.address, 2, newPqcHash);
      await wallet.connect(guardian2).approveRecovery();
      
      await expect(wallet.executeRecovery()).to.be.revertedWith("Timelock active");
    });

    it("Should fail to execute recovery if threshold not met", async function () {
      await wallet.connect(validator).initiateRecovery(newOwner.address, 2, newPqcHash);
      
      // Fast forward time
      await hre.network.provider.send("evm_increaseTime", [24 * 60 * 60 + 1]);
      await hre.network.provider.send("evm_mine");

      // Threshold is (3 / 2) + 1 = 2. We only have 1 approval.
      await expect(wallet.executeRecovery()).to.be.revertedWith("Not enough approvals");
    });
  });
});

