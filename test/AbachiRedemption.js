
const chai = require("chai");
const { ethers } = require("hardhat");
const { expect } = chai;
chai.use(require("chai-as-promised"));

describe("Bridge", () => {

  let owner, aABIHolder, nonaABIHolder;
  let aABI, ABI, ABIBridge, ABIAuth;

  beforeEach(async () => {
    [owner, aABIHolder, nonaABIHolder] = await ethers.getSigners();

    const aABIContract = await ethers.getContractFactory("ERC20Mock");
    const ABIContract = await ethers.getContractFactory("ERC20Mock");
    const bridgeContract = await ethers.getContractFactory("AbachiRedemption");

    // const ABIAuthContract = await ethers.getContractFactory("AbachiAuthority");

    aABI = await aABIContract.deploy('Alpha Abachi', 'aABI', 9, owner.address, 0);
    // ABIAuth = await ABIAuthContract.deploy(owner.address, owner.address, owner.address, owner.address);
    ABI  = await ABIContract.deploy('Abachi', 'ABI', 9, owner.address, 0); 

    ABIBridge = await bridgeContract.deploy(aABI.address, ABI.address);

  });


  describe("pause/unpause bridge", () => {
    
    it("should be able to pause the bridge if owner", async () => {
      expect(await ABIBridge.paused()).to.eq(false);
      await ABIBridge.pause();
      expect(await ABIBridge.paused()).to.eq(true);

      await expect(ABIBridge.pause()).to.be.rejectedWith("Bridge already already paused");

    });

    it("should be able to unpause if owner", async () => {

      await expect(ABIBridge.unpause()).to.be.rejectedWith("Bridge is not paused");

      await ABIBridge.pause();
      expect(await ABIBridge.paused()).to.eq(true);
      
      await ABIBridge.unpause();
      expect(await ABIBridge.paused()).to.eq(false);
    });

    it("should not be able to pause/unpause if not owner", async () => {
      await expect(ABIBridge.connect(aABIHolder).pause()).to.be.rejectedWith("caller is not the owner");
      await expect(ABIBridge.connect(aABIHolder).unpause()).to.be.rejectedWith("caller is not the owner");
    });

    it("should not be able to swap when bridge paused", async () => {
      await ABIBridge.pause();
      await expect(ABIBridge.swap()).to.be.rejectedWith("Bridge is paused");
    });
    
  });

  describe("swap tokens", () => {

    beforeEach(async () => {
      // await aABI.setPresale(owner.address);
      await aABI.mint(aABIHolder.address, BigInt(1000 * 1e9));
      await ABI.mint(ABIBridge.address, BigInt(1e9 * 1e9));
    })

    it("aAbI holder should be able to swap", async () => {

      const balance = await aABI.balanceOf(aABIHolder.address);
      await aABI.connect(aABIHolder).approve(ABIBridge.address, balance);
      
      await expect(ABIBridge.connect(aABIHolder).swap()).to.be.fulfilled;
      expect(await ABI.balanceOf(aABIHolder.address)).to.eq(BigInt(1000 * 1e9));
      expect(await aABI.balanceOf(aABIHolder.address)).to.eq(BigInt(0));

    });

    it("not an aAbI holder should not be able to swap", async () => {
      expect(await aABI.balanceOf(nonaABIHolder.address)).to.eq(0);
      
      await aABI.connect(nonaABIHolder).approve(ABIBridge.address, BigInt(1000));
      await expect(ABIBridge.swap()).to.be.rejectedWith("Invalid aABI amount");
    });

    it("aAbI holder should be able to transfer to recipient", async () => {

      let balance = await aABI.balanceOf(aABIHolder.address);
      await aABI.connect(aABIHolder).approve(ABIBridge.address, balance);
      
      await expect(ABIBridge.connect(aABIHolder).swapFor(nonaABIHolder.address, BigInt(-1))).to.be.rejectedWith("out-of-bounds"); // negative value check
      await expect(ABIBridge.connect(aABIHolder).swapFor(nonaABIHolder.address, BigInt(2**256) - 1n + 100n)).to.be.rejectedWith("out-of-bounds"); // overflow check
      await expect(ABIBridge.connect(aABIHolder).swapFor(aABIHolder.address, BigInt(balance) - BigInt(500 * 1e9))).to.be.fulfilled; // swap and transfer to self

      balance = await ABI.balanceOf(aABIHolder.address); // current balance
      expect(balance).to.eq(BigInt(500 * 1e9));
      
      await expect(ABIBridge.connect(aABIHolder).swapFor(nonaABIHolder.address, balance))
        .to.emit(ABIBridge, "Swap")
        .withArgs(aABIHolder.address, nonaABIHolder.address, balance); // swap the remaining balance
      expect(await ABI.balanceOf(nonaABIHolder.address)).to.eq(balance);

    });

    it("should not be able to transfer more than aAbI holding", async () => {
      let balance = await aABI.balanceOf(aABIHolder.address);
      await aABI.connect(aABIHolder).approve(ABIBridge.address, balance);
      
      await expect(ABIBridge.connect(aABIHolder).swapFor(nonaABIHolder.address, BigInt(balance) + 1n)).to.be.rejectedWith("transfer amount exceeds balance"); // negative value check
    });

    it("owner should be able to withdraw from contract", async () => {
      expect(await ABI.balanceOf(nonaABIHolder.address)).to.eq(0n);
      
      await expect(ABIBridge.withdrawTo(nonaABIHolder.address, BigInt(1000 * 1e9))).to.be.fulfilled;
      expect(await ABI.balanceOf(nonaABIHolder.address)).to.eq(BigInt(1000 * 1e9));
    });

  });

});