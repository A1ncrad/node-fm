import fs from "node:fs";
import os from "node:os";
import { createHash } from "node:crypto";
import { createBrotliDecompress, createBrotliCompress } from "node:zlib";
import { pipeline } from "node:stream";

let user;  
process.on("SIGINT", bye);


function bye() {
    console.log(`Thnaks for using File Manager, ${user}, goodbye!`);
    process.exit();
}

function main() {
    parseArgs();
    process.chdir(os.homedir());

    console.log(`Welcome to the File Manager, ${user}!`);
    console.log(`You are currently in ${process.cwd()}`);

    process.stdin.on("data", async (chunk) => {
        const input = chunk.toString().slice(0, -1).split(" ");
        const command = input[0];
        const args = input.slice(1);
             
        switch(command) {
            case "decompress":
                decompress(args);
                break;
            case "compress":
                compress(args);
                break;
            case "hash":
                await calcHash(args);
                break;
            case "os":
                osInfo(args);
                break;
            case "rm":
                remove(args);
                break;
            case "mv":
                move(args);
                break;
            case "cp":
                copy(args);
                break;
            case "rn":
                rename(args);
                break;
            case "cat":
                await read(args);
                break;
            case "add":
                create(args);
                break;
            case "ls":
                await list(".");    
                break;
            case ".exit":
                bye();
                break;
            case "up":
                goUp();
                break;
            case "cd":
                changeDir(args);
                break;
            default:
                console.log("Invalid input");
                break;
        }

        console.log(`You are currently in ${process.cwd()}`);
    });
}

function osInfo(args) {
    if (args.length != 1 && !args[0].startsWith("--")) {
        console.log("Invalid input");
        return;
    }

    let info;

    switch(args[0]) {
        case "--EOL":
            info = os.EOL;
            break;
        case "--cpus":
            parseCpus();
            return;
        case "--homedir":
            info = os.homedir();
            break;
        case "--username":
            info = os.userInfo().username;
            break;
        case "--architecture":
            info = os.arch();
            break;
        default:
            info = "Invalid input"
            break;
    }

    console.log(info);
}

function parseCpus() {
    let count = 0;
    const cpus = os.cpus().map((cpu) => {
        count++;
        return `Model: ${cpu.model}, Speed: ${cpu.speed / 1000} GHz`;
    });

    console.log(`Amount: ${count}`);
    cpus.forEach((cpu) => console.log(cpu));
}      
        

function handleError(err) {
    if(err) {
        console.log("Operation failed");
    }
}

function move(args) {
    if(!copy(args)) return;
    if( !remove(args.slice(1)) ) return;
}

function create(args) {
    if (args.length != 1) {
        console.log("Invalid input");
        return;
    }

    if (fs.existsSync(args[0])) {
        console.log("Operation failed");
        return;
    }

    fs.writeFile(args[0], "", handleError); 
};
    
    
function calcHash(args) {
    if (args.length != 1) {
        console.log("Invalid input");
        return;
    }

    if (!fs.existsSync(args[0])) {
        console.log("Operation failed");
        return;
    }

    const hash = createHash("sha256");
    
    hash.on("readable", () => {
        const data = hash.read();

        if (data) {
            console.log(data.toString("hex"));
        }
    });


    fs.readFile(args[0], "utf8", (err, data) => {
        if (err) {
            console.log("Operation failed");
        }

        hash.write(data);
        hash.end(); 
    });
    
    return new Promise( (resolve) => hash.on("end", () => resolve()) );
};

function copy(args) {
    if (args.length != 2) {
        console.log("Invalid input");
        return;
    }

    if (!fs.existsSync(args[0])) {
        console.log("Operation failed");
        return;
    }

    const readStream = fs.createReadStream(args[0]);
    const writeStream = fs.createWriteStream(args[1]);

    readStream.on("error", handleError);
    writeStream.on("error", handleError);

    readStream.pipe(writeStream);

    return 1;
}

function remove(args) {
    if (args.length != 1) {
        console.log("Invalid input");
        return;
    }

    if (!fs.existsSync(args[0])) {
        console.log("Operation failed");
        return;
    }

    fs.rm(args[0], handleError);

    return 1;
}


function rename(args) {
    if (args.length != 2) {
        console.log("Invalid input");
        return;
    }

    if (!fs.existsSync(args[0])) {
        console.log("Operation failed");
        return;
    }

    fs.rename(args[0], args[1], handleError);
}


function changeDir(args) {
    if (args.length != 1) {
        console.log("Invalid input");
        return;
    }

    try {
        process.chdir(args[0]);
    } catch {
        console.log("Operation failed");
    }
}

function read(args) {
    if (args.length != 1) {
        console.log("Invalid input");
        return;
    }

    if (!fs.existsSync(args[0])) {
        console.log("Operation failed");
        return;
    }

    let stream = fs.createReadStream(args[0]);
    stream.on("error", handleError);
    stream.pipe(process.stdout);
    return new Promise( (resolve) => stream.on("end", () => resolve()) );
} 

function compress(args) {
    if (args.length != 2) {
        console.log("Invalid input");
        return;
    }

    if (!fs.existsSync(args[0])) {
        console.log("Operation failed");
        return;
    }

    const zip = createBrotliCompress();
    const from = fs.createReadStream(args[0]);
    const to = fs.createWriteStream(args[1]);

    pipeline(from, zip, to, (err) => {
        if (err) {
            console.log("Operation faild");
        }
    });
}

function decompress(args) {
    if (args.length != 2) {
        console.log("Invalid input");
        return;
    }

    if (!fs.existsSync(args[0])) {
        console.log("Operation failed");
        return;
    }
    
    const unzip = createBrotliDecompress();
    const from = fs.createReadStream(args[0]);
    const to = fs.createWriteStream(args[1]);

    pipeline(from, unzip, to, (err) => {
        if (err) {
            console.log("Operation failed");
            return;
        }
    });
}

function goUp() {
    if (process.cwd() === os.homedir()) return;
    process.chdir("..");
}

function list(path) {

    let readdir = (resolve) => {
        fs.readdir(path, {withFileTypes: true}, (err, objects) => {
            if (err) {
                console.log("Operation failed");
                resolve();
            }
            
            let files = objects.filter((obj) => obj.isFile());
            let dirs = objects.filter((obj) => obj.isDirectory());
            
            dirs.sort((a, b) => a.name.localeCompare(b.name));
            files.sort((a, b) => a.name.localeCompare(b.name));

            dirs.forEach((dir) => console.log(`${dir.name} directory`));
            files.forEach((file) => console.log(`${file.name} file`));
            resolve();
        });
    };
       

    return new Promise(readdir);
}

function parseArgs() {

    for (let i = 2; i < process.argv.length; ++i) {
        let string = process.argv[i];

        if (!string.startsWith("--") && !string.includes("=")) {
            console.log("invalid argument");
            break;
        }

        string = string.replace("--", "");
        let [prop, val] = string.split("=");

        if (prop === "username") {
            user = val;
        }
    }
};

main();
