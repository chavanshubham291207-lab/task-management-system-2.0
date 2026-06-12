const brandColor = '#7c3aed';
const brandName = 'TaskFlow Pro';

const baseTemplate = (content) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${brandName}</title>
</head>
<body style="margin:0;padding:0;background:#0f0f1a;font-family:Inter,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f1a;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#1a1a2e;border-radius:16px;overflow:hidden;border:1px solid rgba(124,58,237,0.2);">
        <tr>
          <td style="background:linear-gradient(135deg,#7c3aed,#4f46e5);padding:32px 40px;text-align:center;">
            <h1 style="margin:0;color:#fff;font-size:28px;font-weight:700;letter-spacing:-0.5px;">⚡ ${brandName}</h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:14px;">Enterprise Task Management</p>
          </td>
        </tr>
        <tr><td style="padding:40px;">${content}</td></tr>
        <tr>
          <td style="padding:24px 40px;background:#0f0f1a;text-align:center;border-top:1px solid rgba(124,58,237,0.1);">
            <p style="margin:0;color:#6b7280;font-size:12px;">© 2024 ${brandName}. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

const btn = (text, url) => `
  <a href="${url}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;margin:24px 0;">${text}</a>`;

const h2 = (text) => `<h2 style="color:#e5e7eb;font-size:22px;margin:0 0 16px;">${text}</h2>`;
const p = (text) => `<p style="color:#9ca3af;font-size:15px;line-height:1.7;margin:0 0 12px;">${text}</p>`;

exports.welcomeEmail = (name) => baseTemplate(`
  ${h2(`Welcome to ${brandName}, ${name}! 🎉`)}
  ${p(`We're excited to have you on board. ${brandName} is your all-in-one workspace for managing tasks, projects, and team collaboration.`)}
  ${p('Get started by creating your first workspace and inviting your team members.')}
  ${btn('Go to Dashboard', `${process.env.CLIENT_URL}/dashboard`)}
  ${p('If you have any questions, our support team is always ready to help.')}
`);

exports.passwordResetEmail = (name, resetUrl) => baseTemplate(`
  ${h2(`Password Reset Request`)}
  ${p(`Hi ${name}, we received a request to reset your password.`)}
  ${p('Click the button below to reset your password. This link expires in <strong style="color:#7c3aed;">10 minutes</strong>.')}
  ${btn('Reset Password', resetUrl)}
  ${p('If you did not request a password reset, please ignore this email — your account is safe.')}
`);

exports.workspaceInviteEmail = (inviterName, workspaceName, inviteUrl) => baseTemplate(`
  ${h2(`You've been invited! 🚀`)}
  ${p(`<strong style="color:#e5e7eb;">${inviterName}</strong> has invited you to join the <strong style="color:#7c3aed;">${workspaceName}</strong> workspace on ${brandName}.`)}
  ${p('Click below to accept the invitation and start collaborating.')}
  ${btn('Accept Invitation', inviteUrl)}
  ${p('This invitation link expires in 48 hours.')}
`);

exports.taskAssignedEmail = (assigneeName, taskTitle, taskUrl, dueDate) => baseTemplate(`
  ${h2(`New Task Assigned to You`)}
  ${p(`Hi ${assigneeName}, a new task has been assigned to you:`)}
  <div style="background:#0f0f1a;border:1px solid rgba(124,58,237,0.3);border-radius:8px;padding:20px;margin:16px 0;">
    <p style="margin:0;color:#e5e7eb;font-size:16px;font-weight:600;">📋 ${taskTitle}</p>
    ${dueDate ? `<p style="margin:8px 0 0;color:#9ca3af;font-size:13px;">Due: ${new Date(dueDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>` : ''}
  </div>
  ${btn('View Task', taskUrl)}
`);

exports.dueDateReminderEmail = (userName, taskTitle, dueDate, taskUrl) => baseTemplate(`
  ${h2(`⏰ Task Due Soon`)}
  ${p(`Hi ${userName}, this is a reminder that the following task is due soon:`)}
  <div style="background:#0f0f1a;border:1px solid rgba(239,68,68,0.3);border-radius:8px;padding:20px;margin:16px 0;">
    <p style="margin:0;color:#e5e7eb;font-size:16px;font-weight:600;">📋 ${taskTitle}</p>
    <p style="margin:8px 0 0;color:#ef4444;font-size:13px;font-weight:600;">Due: ${new Date(dueDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
  </div>
  ${btn('View Task', taskUrl)}
`);
