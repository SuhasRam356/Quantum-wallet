import { expect } from "chai";
import hre from "hardhat";

describe("QuantumSmartWallet", function () {
  let wallet;
  let owner;
  let entryPoint;
  let otherAccount;

  // Simulate an ML-DSA public key (1952 bytes for ML-DSA-65)
  const mockPqcPubKey = hre.ethers.hexlify(hre.ethers.randomBytes(1952));
  const mockPqcPubKeyHash = hre.ethers.keccak256(mockPqcPubKey);

  beforeEach(async function () {
    [owner, entryPoint, otherAccount] = await hre.ethers.getSigners();
    const Wallet = await hre.ethers.getContractFactory("QuantumSmartWallet");
    // constructor(address _entryPoint, bytes32 _pqcPubKeyHash, address _initialOwner)
    wallet = await Wallet.deploy(entryPoint.address, mockPqcPubKeyHash, owner.address);
    await wallet.waitForDeployment();
  });

  it("Should set the right owner, entryPoint, and PQC key hash", async function () {
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

  it("Should execute transaction with a valid PQC public key when called by EntryPoint", async function () {
    const depositAmount = hre.ethers.parseEther("1.0");
    await owner.sendTransaction({
      to: await wallet.getAddress(),
      value: depositAmount,
    });

    const transferAmount = hre.ethers.parseEther("0.5");
    const targetAddress = otherAccount.address;
    const data = "0x";

    const initialBalance = await hre.ethers.provider.getBalance(targetAddress);

    // Call execute from the entryPoint, passing the real PQC public key
    await wallet.connect(entryPoint).execute(targetAddress, transferAmount, data, mockPqcPubKey);

    const finalBalance = await hre.ethers.provider.getBalance(targetAddress);
    expect(finalBalance - initialBalance).to.equal(transferAmount);
  });

  it("Should reject transaction with wrong PQC public key even if called by EntryPoint", async function () {
    const wrongPqcPubKey = hre.ethers.hexlify(hre.ethers.randomBytes(1952));

    await expect(
      wallet.connect(entryPoint).execute(otherAccount.address, 0, "0x", wrongPqcPubKey)
    ).to.be.revertedWith("Invalid PQC public key");
  });

  it("Should reject transaction if caller is not the EntryPoint", async function () {
    await expect(
      wallet.connect(owner).execute(otherAccount.address, 0, "0x", mockPqcPubKey)
    ).to.be.revertedWith("Only EntryPoint can call this");
  });

  it("Should allow EntryPoint to update PQC key hash", async function () {
    const newPubKey = hre.ethers.hexlify(hre.ethers.randomBytes(1952));
    const newHash = hre.ethers.keccak256(newPubKey);

    await wallet.connect(entryPoint).setPqcPublicKeyHash(newHash);
    expect(await wallet.pqcPubKeyHash()).to.equal(newHash);
  });

  it("Should reject non-EntryPoint from updating PQC key hash", async function () {
    const newHash = hre.ethers.keccak256(hre.ethers.randomBytes(32));
    await expect(
      wallet.connect(owner).setPqcPublicKeyHash(newHash)
    ).to.be.revertedWith("Only EntryPoint can call this");
  });

  it("Should correctly validate a UserOp with a valid ECDSA signature", async function () {
    const userOpHash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("test user op hash"));
    const messageHash = hre.ethers.hashMessage(hre.ethers.getBytes(userOpHash));
    const signature = await owner.signMessage(hre.ethers.getBytes(userOpHash));

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
      signature: signature
    };

    // validateUserOp returns 0 for success
    const result = await wallet.connect(entryPoint).validateUserOp.staticCall(userOp, userOpHash, 0);
    expect(result).to.equal(0);
  });

  it("Should fail validateUserOp with an invalid ECDSA signature", async function () {
    const userOpHash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("test user op hash"));
    const signature = await otherAccount.signMessage(hre.ethers.getBytes(userOpHash)); // Wrong signer

    const userOp = {
      sender: await wallet.getAddress(),
      nonce: 0,
      initCode: "0x",
      callData: "0x",
      accountGasLimits: hre.ethers.ZeroHash,
      preVerificationGas: 0,
      gasFees: hre.ethers.ZeroHash,
      paymasterAndData: "0x",
      signature: signature
    };

    // validateUserOp returns 1 (SIG_VALIDATION_FAILED) for wrong signer
    const result = await wallet.connect(entryPoint).validateUserOp.staticCall(userOp, userOpHash, 0);
    expect(result).to.equal(1);
  });
});

