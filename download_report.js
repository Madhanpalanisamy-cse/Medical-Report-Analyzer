const fetch = require('node-fetch');
const fs = require('fs');

(async () => {
  try {
    const response = await fetch('http://localhost:5000/api/pdf/download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        score: 78,
        risk: 'Medium',
        analysis: 'Test analysis for demo PDF',
        reportName: 'demo_report.pdf'
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Server responded with error:', errText);
      process.exit(1);
    }

    const fileStream = fs.createWriteStream('result.pdf');
    response.body.pipe(fileStream);
    fileStream.on('finish', () => {
      console.log('✅ PDF saved as result.pdf');
    });
  } catch (err) {
    console.error('Request failed:', err);
    process.exit(1);
  }
})();
