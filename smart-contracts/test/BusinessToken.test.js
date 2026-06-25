const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("BusinessToken", function () {
  let token, owner, investor1, investor2;

  beforeEach(async function () {
    [owner, investor1, investor2] = await ethers.getSigners();
    const BusinessToken = await ethers.getContractFactory("BusinessToken");
    token = await BusinessToken.deploy(
      "Chai Corner Token",
      "CCT",
      5000,
      "64f8a1b2c3d4e5f6a7b8c9d0",
      100,
      500000
    );
    await token.waitForDeployment();
  });

  describe("Deployment", function () {
    it("should have correct name and symbol", async function () {
      expect(await token.name()).to.equal("Chai Corner Token");
      expect(await token.symbol()).to.equal("CCT");
    });

    it("should have 0 decimals", async function () {
      expect(await token.decimals()).to.equal(0);
    });

    it("should mint total supply to owner", async function () {
      expect(await token.totalSupply()).to.equal(5000);
      expect(await token.balanceOf(owner.address)).to.equal(5000);
    });

    it("should store business metadata", async function () {
      expect(await token.businessId()).to.equal("64f8a1b2c3d4e5f6a7b8c9d0");
      expect(await token.tokenPriceINR()).to.equal(100);
      expect(await token.fundingGoalINR()).to.equal(500000);
    });

    it("should return correct getBusinessInfo", async function () {
      const info = await token.getBusinessInfo();
      expect(info._businessId).to.equal("64f8a1b2c3d4e5f6a7b8c9d0");
      expect(info._tokenPriceINR).to.equal(100);
      expect(info._fundingGoalINR).to.equal(500000);
      expect(info._totalSupply).to.equal(5000);
      expect(info._circulatingSupply).to.equal(0); // all held by owner
    });
  });

  describe("Transfers", function () {
    it("should transfer tokens from owner to investor", async function () {
      await token.transfer(investor1.address, 10);
      expect(await token.balanceOf(investor1.address)).to.equal(10);
      expect(await token.balanceOf(owner.address)).to.equal(4990);
    });

    it("should track circulating supply", async function () {
      await token.transfer(investor1.address, 100);
      const info = await token.getBusinessInfo();
      expect(info._circulatingSupply).to.equal(100);
    });

    it("should revert on insufficient balance", async function () {
      await expect(
        token.connect(investor1).transfer(investor2.address, 1)
      ).to.be.revertedWithCustomError(token, "ERC20InsufficientBalance");
    });
  });

  describe("Approvals", function () {
    it("should approve and transferFrom", async function () {
      await token.approve(investor1.address, 50);
      await token.connect(investor1).transferFrom(owner.address, investor2.address, 50);
      expect(await token.balanceOf(investor2.address)).to.equal(50);
    });
  });

  describe("Mint & Burn (Owner Only)", function () {
    it("should allow owner to mint", async function () {
      await token.mint(investor1.address, 500);
      expect(await token.balanceOf(investor1.address)).to.equal(500);
      expect(await token.totalSupply()).to.equal(5500);
    });

    it("should allow owner to burn", async function () {
      await token.transfer(investor1.address, 100);
      await token.burn(investor1.address, 50);
      expect(await token.balanceOf(investor1.address)).to.equal(50);
      expect(await token.totalSupply()).to.equal(4950);
    });

    it("should revert mint from non-owner", async function () {
      await expect(
        token.connect(investor1).mint(investor1.address, 100)
      ).to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount");
    });

    it("should revert burn from non-owner", async function () {
      await expect(
        token.connect(investor1).burn(investor1.address, 100)
      ).to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount");
    });
  });
});
