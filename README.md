# Make a platform status checker script and deploy it to an AWS EC2 instance

## Make the Script
Firstly make a script you want to run. I am going to run this script in Node js so make sure Node js is installed.
### Webhook
We will use a webhook to message us in discord if any of our servers are down. A webhook is an HTTP-based callback function that allows lightweight, event-driven communication between 2 application programming interfaces (APIs). You can learn more about it [here](https://www.redhat.com/en/topics/automation/what-is-a-webhook).

To create a webhook for a discord server go to a Discord server's settings and follow the path of "Apps > Integrations > Webhooks > New Webhook". The webhook should be created now and click on it and then click on "Copy Url" as we need it to send messages to discord.

A package, `node-fetch` has to be installed as well if your node version is less than `18`:
```bash
npm install node-fetch
```

### Make the script:
```js
import fetch from "node-fetch"
async function postplatformstatus() {
  let allstatuses = [
    // use any urls and check their status 
    'https://api.reinforz.ai/ping',
    'https://app.reinforz.ai',
    'https://reinforz.ai',
  ];
  const message = []; // array containing the messages to send
  for (const status of allstatuses) {
    const response = await fetch(status);
    if (response.status >= 400) {
      const singleMessage = `${status} is down. Status: ${response.status} 🔴`
      // If any error response is recieved add it to messages
      console.log(singleMessage);
      message.push(singleMessage);
    }
  }
  const RoleId = 'copy a role ';
  if (message.length !== 0) {
    // use the send a message to discord using the webhook URL to see if which servers are inactive.
    await fetch(
      'the copied webhook url',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: `<@&${RoleId}>\n${message.join('\n')}`,
        }),
      }
    );
  }
}

postplatformstatus();
```

## Make the AWS EC2 instance
Then make a AWS EC2 instance. To learn more about how to create an EC2 instance check out the [official AWS documentation](https://docs.aws.amazon.com/efs/latest/ug/gs-step-one-create-ec2-resources.html).

## Setup the AWS EC2 instance
### Logging in
After the EC2 instance is up and running, you should be able to login to the AWS instance using the following command:
```bash
ssh ec2-user@<your-ec2-ip-address>
```
We are using SSH to establish a cryptographic network protocol to securely connect to our remote host.
The following also needs to be added to the end of the `config` file in your `.ssh` folder.
```
Host <your-ec2-ip-address>
    HostName <your-ec2-ip-address>
    User ec2-user
    IdentityFile "path-to-SSH-private-key.pem"
```
> **Note:** The path of the file is `C:\Users\<Username>\.ssh\config` in Windows.

### Set up node
Set up softwares needed to run your script. I am using node so I will install it. 
Installing node version manager nvm:
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.2/install.sh | bash
```
> **Note:** This will install version 0.39.2, to get the updated one go to this link: https://github.com/nvm-sh/nvm#installing-and-updating.

Next, we will install the 16.x version of node with the command `nvm install 16`. Afterwards, verify if node and npm are installed using the commands `node -v` and `npm -v` in the terminal of the EC2 instance.
If node and npm are not being recognized do the following:
- for node:
  ```bash
  sudo ln -s /home/<my_user>/.nvm/versions/node/<my_node_version>/bin/node /usr/bin/node
  ```
- for npm:
  ```bash
  sudo ln -s /home/<my_user>/.nvm/versions/node/<my_node_version>/bin/npm /usr/bin/npm
  ```

### Cron job in EC2 instance
We will now set up a cron job to run on our server. Cron jobs are a standard method of scheduling tasks to run on a machine. Cron is a service running in the background that will execute commands (jobs) at a specified time, or at a regular interval. More details about it can be found [here](https://www.hostdime.com/kb/hd/command-line/working-with-cron-jobs).

Type the following in the terminal to setup a cronjob:
```bash
crontab -e
```

Add the following in a new line and save and exit the file using `:wq`:
```
*/7 * * * * bash /home/myCronScript.sh
```

This basically runs the script `/home/myCronScript.sh` every 7 minutes. Of course we dont have the bash script now. So lets set them up next.

### Adding scripts
We need 2 bash scripts in our EC2 instance. One for the cron job and another for the Deployment Script.
- The cron script in `/home/myCronScript.sh`:
  ```bash
  #!/bin/bash
  RED='\033[0;31m'
  NC='\033[0m'

  cd /home/platform-status

  if ! (node /home/platform-status/index.js) then
    printf "${RED}Failed to run platform status checker${NC}\n"
    exit 1
  fi
  ```
- The deployment script in `/home/myDeployScript.sh`:
  ```bash
  #!/bin/bash
  RED='\033[0;31m'
  NC='\033[0m'

  cd /home/platform-status

  if ! (npm install --production) then
    printf "${RED}Failed to install root dependencies${NC}\n"
    exit 1
  fi
  ```
## Deploy to EC2 instance
Finally, we have to find a way to upload to the remote server and run the deploy script automatically. One way to do them is to use Github Actions.
GitHub Actions is a continuous integration and continuous delivery (CI/CD) platform that allows us to automate our build, test, and deployment pipeline. Check out [their documentation](https://docs.github.com/en/actions) if you want to know more about it.

We are going to add a simple github action to automate deploying to our EC2 instance. Add new folders `.github\workflows\` in the project working and put a file based on the following path, deploy.yml` and add the following to the root directory:
```yml
name: Deploy Script

# run the deployment process if any changes comes to a js file
on:
  push:
    branches:
      - 'master'
    paths:
      - '**.js'
      - '**.json'

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
    - name: Checkout branch
      uses: actions/checkout@v1

    # upload to the ec2 host
    - name: Upload to Server
      uses: easingthemes/ssh-deploy@main
      env:
        SSH_PRIVATE_KEY: ${{ secrets.SSH_PRIVATE_KEY }}
        ARGS: "-rltgoDzvO --delete"
        SOURCE: ""
        REMOTE_HOST: ${{ secrets.REMOTE_HOST }}
        REMOTE_USER: ${{ secrets.SSH_USERNAME }}
        TARGET: "/home/platform-status/"
        EXCLUDE: "/node_modules/, /.github/, /.gitignore, /README.md"

    # deploy to the ec2 host
    - name: Deploy to production
      uses: appleboy/ssh-action@v0.1.2
      with:
        host: ${{ secrets.REMOTE_HOST }}
        key: ${{ secrets.SSH_PRIVATE_KEY }}
        username: ${{ secrets.SSH_USERNAME }}
        script: |
          bash /home/myDeployScript.sh
```
