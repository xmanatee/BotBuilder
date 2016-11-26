module.exports = {
    chatGreeting: "Hi...",
    welcome: "Yo!",
    canceled: "You canceled",
    goodbye: "Ok... See you later!",
    menu: {
        prompt: "Watsup?",
        choices: "Your choices are DTMF, Digits, Recordings, or Chat.",
        help: "You can say options to hear the list of choices again, quit to end the demo, or help."
    },
    notes: {
        prompt: "Launching Notes!",
        result: "You selected %s"
    },
    digits: {
        intro: "You can collect digits from a user with an optional stop tone.",
        prompt: "Please enter your 5 to 10 digit account number followed by pound.",
        inavlid: "I'm sorry. That account number isn't long enough.",
        confirm: "You entered %s. Is that correct?"
    },
    record: {
        prompt: "Launching Recording!",
        result: "Your message was %d seconds long."
    },
    chat: {
        intro: "You can easily send a chat message to a user that has called your bot.",
        confirm: "Would you like to send a message?",
        failed: "Message delivery failed.",
        sent: "Message sent."
    }
};
