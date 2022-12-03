# Automatically receive messages in discord about a platform's status

Hello everyone! In this blog, we will look at how to automate the process of getting notified in discord if a platform's status is down. It is very helpful as it notifies developers in discord when their website is down. We will learn about the following topics in this blog:
- Using utilities like webhooks, cron jobs, SSH
- Automating deployment to a remote host like an Amazon EC2 Instance

## Requirements
Anyone with a basic knowledge of any coding languages can follow along with this blog. Having a basic knowledge of Git is recommended as well.

## Make the Script
Firstly, we need to make the script we want to run. The script will be a simple Node.js platform status checker running regularly in the background and report to Discord if any of the platforms are down. You can make any script you want. Of course, absolute beginners are urged to follow along with the blog.
### Webhook
We will use a webhook to message us in discord if any of our servers are down. A webhook is an HTTP-based callback function that allows lightweight, event-driven communication between 2 application programming interfaces (APIs). You can learn more about it [here](https://www.redhat.com/en/topics/automation/what-is-a-webhook).

To create a webhook for a discord server go to a Discord server's settings and follow the path of "Apps > Integrations > Webhooks > New Webhook". The webhook should be created now. Click on it and then click on "Copy Url" as we need it to send messages to discord.

We also have to make http requests in our script. There are a lot of packages available in npm but I will go with `node-fetch` in this tutorial. The `node-fetch` package only needs to be installed if your node version is less than `18` as it is build into `node` otherwise. We will install it by using the following command:
```bash
npm install node-fetch
```

### Make the script:
```js
import fetch from "node-fetch"
async function postplatformstatus() {
  const allPlatforms = [
    // use any urls and check their status 
    'https://api.reinforz.ai/ping',
    'https://app.reinforz.ai',
    'https://reinforz.ai',
  ];
  const messages = []; // array containing the messages to send
  for (const platform of allPlatforms) {
    const response = await fetch(platform);
    if (response.status >= 400) {
      const singleMessage = `${platform} is down. Status: ${response.status} 🔴`
      // If any error response is recieved add it to messages
      console.log(singleMessage);
      messages.push(singleMessage);
    }
  }
  const ROLE_ID = '<copy a role Id from discord>';
  if (messages.length !== 0) {
    // use the send a message to discord using the webhook URL to see if which servers are inactive.
    await fetch(
      '<the copied webhook url>',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // <@ROLE_ID> is used to notify members with a specific discord role
          content: `<@&${ROLE_ID}>\n${messages.join('\n')}`,
        }),
      }
    );
  }
}

postplatformstatus();
```

> **Note**: Make an empty GitHub repository and push the new repository changes.

## Make the AWS EC2 instance
Now we need to make an AWS EC2 instance. To learn more about how to create an EC2 instance check out the [official AWS documentation](https://docs.aws.amazon.com/efs/latest/ug/gs-step-one-create-ec2-resources.html). Of course, you can use any other remote virtual hosts other than EC2, and the following steps will be similar.

## Setup the AWS EC2 instance
### Logging in
After the EC2 instance is up and running, you should be able to log in to the AWS instance using the following command:
```bash
ssh ec2-user@<your-ec2-ip-address>
```
We are using SSH to establish a cryptographic network protocol to securely connect to our remote host. Learn more about ssh [here](https://en.wikipedia.org/wiki/Secure_Shell). The following also needs to be added to the end of the `config` file in your `.ssh` folder.
```
Host <your-ec2-ip-address>
    HostName <your-ec2-ip-address>
    User ec2-user
    IdentityFile "path-to-SSH-private-key.pem"
```
> **Note:** The path of the file is `C:\Users\<Username>\.ssh\config` in Windows.

### Set up node
Set up the softwares needed to run your script. I am using node so I will install it. First, I will install node version manager (nvm):
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.2/install.sh | bash
```
> **Note:** This will install version 0.39.2, to get the updated one go to this link: https://github.com/nvm-sh/nvm#installing-and-updating.

Next, we will install the `16.x` version of Node with the command `nvm install 16`. Afterwards, verify if node and npm are installed using the commands `node -v` and `npm -v` in the terminal of the EC2 instance.
If node and npm are not being recognized do the following:
- for node:
  ```bash
  sudo ln -s /home/<my_user>/.nvm/versions/node/<my_node_version>/bin/node /usr/bin/node
  ```
- for npm:
  ```bash
  sudo ln -s /home/<my_user>/.nvm/versions/node/<my_node_version>/bin/npm /usr/bin/npm
  ```
The above commands link the actual node and npm scripts to `/usr/bin/` because bash recognizes scripts from there.

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

This runs the script `/home/myCronScript.sh` every 7 minutes. Of course, we don't have the bash script now. So let's set them up next.

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
    printf "${RED}Failed to install dependencies${NC}\n"
    exit 1
  fi
  ```
## Deploy to EC2 instance
Finally, we have to find a way to upload to the remote server and run the deploy script automatically. One way to do them is to use GitHub Actions.
GitHub Actions is a continuous integration and continuous delivery (CI/CD) platform that allows us to automate our build, test, and deployment pipeline. Check out [their documentation](https://docs.github.com/en/actions) if you want to know more about it.

We are going to add a simple GitHub action to automate deploying to our EC2 instance. Add new folders `.github\workflows\` in the project working and put a file based on the following path, deploy.yml`, and add the following to the root directory:
```yml
name: Deploy Script

# run the deployment process if any changes come to a js file
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
As you may have noticed, we need to add the secrets of our EC2 instance to our GitHub repository to make this GitHub Action work. Otherwise, it will not know where our server is. To add the secrets go to your repository, and follow the path: `settings` > `secrets` > `actions`. Then, click on `New Repository Secret` and add the following secrets:
- `REMOTE_HOST`: the IP address of your remote host
- `SSH_PRIVATE_KEY`: the private key needed to ssh into the server
- `SSH_USERNAME`: the username of the user on the remote machine.

Finally, commit and push all your changes and observe the GitHub action running in GitHub. It should run and end successfully.

## Conclusion
Thank you for reading! If you have any questions or face any problems while doing the steps written in this blog, don't hesitate to comment down below. Also, check out our website at [reinforz.ai](https://www.reinforz.ai/).

<div style="text-align: right; font-style: italic">
Written by <a href="https://github.com/imoxto">Rafid Hamid</a>
</div>