const fs = require('fs');
const path = require('path');

const saveGmailDataToFile = (req, res) => {
    const { subject, ...data } = req.body;

    if (!subject) {
        return res.status(400).json({ error: 'Subject is required' });
    }

    const filePath = path.join(__dirname, './testcontainer', `${subject}.txt`);
    const fileData = JSON.stringify(data, null, 2);

    fs.writeFile(filePath, fileData, (err) => {
        if (err) {
            console.error('Error writing file:', err);
            return res.status(500).json({ error: 'Failed to save data' });
        }

        res.status(200).json({ message: 'Data saved successfully' });
    });
};
 
module.exports = {
    saveGmailDataToFile
};
