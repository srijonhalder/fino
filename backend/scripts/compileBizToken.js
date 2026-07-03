const solc = require('solc');
const fs = require('fs');
const path = require('path');

// Simple ERC-20 Token Contract
const source = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract BizToken {
    string public name;
    string public symbol;
    uint8 public decimals = 0;
    uint256 public totalSupply;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    constructor(string memory name_, string memory symbol_, uint256 totalSupply_) {
        name = name_;
        symbol = symbol_;
        totalSupply = totalSupply_;
        balanceOf[msg.sender] = totalSupply_;
        emit Transfer(address(0), msg.sender, totalSupply_);
    }

    function transfer(address to, uint256 value) public returns (bool) {
        require(to != address(0), "Transfer to zero address");
        require(balanceOf[msg.sender] >= value, "Insufficient balance");
        balanceOf[msg.sender] -= value;
        balanceOf[to] += value;
        emit Transfer(msg.sender, to, value);
        return true;
    }

    function approve(address spender, uint256 value) public returns (bool) {
        require(spender != address(0), "Approve to zero address");
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    function transferFrom(address from, address to, uint256 value) public returns (bool) {
        require(from != address(0), "Transfer from zero address");
        require(to != address(0), "Transfer to zero address");
        require(balanceOf[from] >= value, "Insufficient balance");
        require(allowance[from][msg.sender] >= value, "Insufficient allowance");
        balanceOf[from] -= value;
        balanceOf[to] += value;
        allowance[from][msg.sender] -= value;
        emit Transfer(from, to, value);
        return true;
    }

    function increaseAllowance(address spender, uint256 addedValue) public returns (bool) {
        allowance[msg.sender][spender] += addedValue;
        emit Approval(msg.sender, spender, allowance[msg.sender][spender]);
        return true;
    }
}
`;

const input = {
  language: 'Solidity',
  sources: { 'BizToken.sol': { content: source } },
  settings: {
    evmVersion: 'paris',
    optimizer: { enabled: true, runs: 200 },
    outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object'] } },
  },
};

const output = JSON.parse(solc.compile(JSON.stringify(input)));

if (output.errors) {
  output.errors.forEach((e) => {
    if (e.severity === 'error') {
      console.error('Compile error:', e.formattedMessage);
      process.exit(1);
    } else {
      console.warn('Warning:', e.formattedMessage);
    }
  });
}

const contract = output.contracts['BizToken.sol']['BizToken'];
const artifact = {
  abi: contract.abi,
  bytecode: '0x' + contract.evm.bytecode.object,
};

const outPath = path.join(__dirname, '..', 'src', 'contracts', 'BizToken.json');
fs.writeFileSync(outPath, JSON.stringify(artifact, null, 2));
console.log('BizToken compiled successfully!');
console.log('ABI:', artifact.abi.length, 'entries');
console.log('Bytecode length:', artifact.bytecode.length, 'chars');
