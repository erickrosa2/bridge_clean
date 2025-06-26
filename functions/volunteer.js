const jwt = require('jsonwebtoken');
const fs = require('fs').promises;
const path = require('path');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  try {
    const { request_slug, mentor_username, message, mentee_email } = JSON.parse(event.body);
    
    if (!request_slug || !mentor_username || !mentee_email) {
      return { 
        statusCode: 400, 
        body: JSON.stringify({ error: 'Missing required fields' })
      };
    }

    // Get mentor's email from mentor file
    let mentorEmail;
    try {
      const mentorPath = path.join(process.cwd(), 'src', 'mentors');
      const files = await fs.readdir(mentorPath);
      const mentorFile = files.find(f => f.includes(mentor_username.replace(/[^a-z0-9-]/gi, '')) || f.replace('.md', '') === mentor_username);
      
      if (mentorFile) {
        const content = await fs.readFile(path.join(mentorPath, mentorFile), 'utf-8');
        const emailMatch = content.match(/email:\s*(.+)/);
        if (emailMatch) {
          mentorEmail = emailMatch[1].trim();
        }
      }
    } catch (error) {
      console.log('Could not find mentor file');
    }
    
    if (!mentorEmail) {
      return { 
        statusCode: 400, 
        body: JSON.stringify({ error: 'Mentor not found. Make sure you added yourself as a mentor first.' })
      };
    }

    const baseUrl = process.env.URL || 'https://yoursite.netlify.app';

    // Send introduction emails
    const menteeIntro = {
      from: process.env.FROM_EMAIL || 'bridge@resend.dev',
      to: mentee_email,
      subject: `bridge connected! meet ${mentor_username}`,
      html: `
        <div style="font-family: courier, monospace; line-height: 1.5;">
          <h2>your bridge is connected!</h2>
          <p><strong>mentor:</strong> ${mentor_username}</p>
          <p><strong>contact them at:</strong> ${mentorEmail}</p>
          ${message ? `<p><strong>their message:</strong> "${message}"</p>` : ''}
          <p>reach out directly to schedule your chat. they're expecting to hear from you!</p>
          
          <hr style="margin: 20px 0;">
          <p style="font-size: 12px;">
            loved this experience?<br>
            share bridge with fellow creatives: ${baseUrl}
          </p>
          <p style="font-size: 12px;">bridge</p>
        </div>
      `
    };

    const mentorIntro = {
      from: process.env.FROM_EMAIL || 'bridge@resend.dev',
      to: mentorEmail,
      subject: `bridge connected! your mentee contact`,
      html: `
        <div style="font-family: courier, monospace; line-height: 1.5;">
          <h2>your mentorship offer was accepted!</h2>
          <p><strong>request:</strong> ${request_slug}</p>
          <p><strong>contact your mentee at:</strong> ${mentee_email}</p>
          <p>they'll be reaching out soon to schedule a chat. thanks for volunteering!</p>
          
          <hr style="margin: 20px 0;">
          <p style="font-size: 12px;">
            you're building something beautiful!<br>
            help more creatives by sharing bridge: ${baseUrl}
          </p>
          <p style="font-size: 12px;">bridge</p>
        </div>
      `
    };

    // Send both emails
    const [menteeResponse, mentorResponse] = await Promise.all([
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(menteeIntro)
      }),
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(mentorIntro)
      })
    ]);

    if (!menteeResponse.ok || !mentorResponse.ok) {
      console.error('Failed to send introduction emails');
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to send introduction emails' })
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        status: 'connected',
        message: 'Bridge connected! Both parties have secure contact info.'
      })
    };

  } catch (error) {
    console.error('Volunteer function error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};