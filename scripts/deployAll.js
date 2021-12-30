const { ethers } = require("hardhat");

async function main() {

    const [deployer] = await ethers.getSigners();

    console.log('Deploying contracts with the account: ' + deployer.address);
    console.log('----------------------------------------------------------------------------------')

    // todo: add deploy code here

)

}

main()
    .then(() => process.exit())
    .catch(error => {
        console.error(error);
        process.exit(1);
})
