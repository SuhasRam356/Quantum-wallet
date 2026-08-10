import { expect } from "chai";
import hre from "hardhat";

describe("QuantumSmartWallet", function () {
  let wallet;
  let owner;
  let entryPoint;
  let validator;
  let otherAccount;

  // Simulate an ML-DSA public key (1952 bytes for ML-DSA-65)
  const mockPqcPubKey = hre.ethers.hexlify(hre.ethers.randomBytes(1952));
  const mockPqcPubKeyHash = hre.ethers.keccak256(mockPqcPubKey);

  beforeEach(async function () {
    [owner, entryPoint, validator, otherAccount] = await hre.ethers.getSigners();
    const Wallet = await hre.ethers.getContractFactory("QuantumSmartWallet");
    // constructor(address _entryPoint, bytes32 _pqcPubKeyHash, address _initialOwner, address _pqcValidator)
    wallet = await Wallet.deploy(entryPoint.address, mockPqcPubKeyHash, owner.address, validator.address);
    await wallet.waitForDeployment();
  });

  it("Should set the right owner, entryPoint, PQC key hash, and validator", async function () {
    expect(await wallet.owner()).to.equal(owner.address);
    expect(await wallet.entryPoint()).to.equal(entryPoint.address);
    expect(await wallet.pqcPubKeyHash()).to.equal(mockPqcPubKeyHash);
    expect(await wallet.pqcValidator()).to.equal(validator.address);
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

    // Call execute from the entryPoint (pqcPubKey is no longer needed here)
    await wallet.connect(entryPoint).execute(targetAddress, transferAmount, data);

    const finalBalance = await hre.ethers.provider.getBalance(targetAddress);
    expect(finalBalance - initialBalance).to.equal(transferAmount);
  });

  it("Should reject execute if caller is not the EntryPoint", async function () {
    await expect(
      wallet.connect(owner).execute(otherAccount.address, 0, "0x")
    ).to.be.revertedWith("Only EntryPoint can call this");
  });

  it("Should correctly validate a UserOp with valid User and Validator ECDSA signatures", async function () {
    const userOpHash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("test user op hash"));
    
    // Both sign the same hash
    const userSignature = await owner.signMessage(hre.ethers.getBytes(userOpHash));
    const validatorSignature = await validator.signMessage(hre.ethers.getBytes(userOpHash));
    
    // Concat signatures (130 bytes total: 65 + 65. The `0x` is removed from the second sig)
    const combinedSignature = userSignature + validatorSignature.slice(2);

    // Mock PackedUserOperation
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

    // validateUserOp returns 0 for success
    const result = await wallet.connect(entryPoint).validateUserOp.staticCall(userOp, userOpHash, 0);
    expect(result).to.equal(0);
  });

  it("Should fail validateUserOp if Validator signature is missing or wrong", async function () {
    const userOpHash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("test user op hash"));
    const userSignature = await owner.signMessage(hre.ethers.getBytes(userOpHash));
    const wrongValidatorSignature = await otherAccount.signMessage(hre.ethers.getBytes(userOpHash));
    
    const combinedSignature = userSignature + wrongValidatorSignature.slice(2);

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

    // validateUserOp returns 1 (SIG_VALIDATION_FAILED)
    const result = await wallet.connect(entryPoint).validateUserOp.staticCall(userOp, userOpHash, 0);
    expect(result).to.equal(1);
  });

  it("Should fail validateUserOp if signature length is less than 130 bytes", async function () {
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
});

