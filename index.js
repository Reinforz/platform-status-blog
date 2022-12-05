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
    // We will only notify people if an error has occurred
    if (response.status >= 400) {
      // If the status code sent by the response is 400 or higher,
      // then it means an error is happening and we will notify relevent people with the platform 
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