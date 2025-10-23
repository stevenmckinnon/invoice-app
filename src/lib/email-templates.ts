/**
 * Email templates for authentication-related emails
 */

interface PasswordResetEmailProps {
  resetUrl: string;
  userEmail: string;
  logoUrl?: string;
}

export const getPasswordResetEmailHtml = ({
  resetUrl,
  userEmail,
  logoUrl,
}: PasswordResetEmailProps): string => {
  // Construct the full logo URL
  const baseUrl =
    logoUrl || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const fullLogoUrl = logoUrl || `${baseUrl}/email-logo.png`;
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td { font-family: Arial, Helvetica, sans-serif !important; }
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; font-family: Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
          
          <!-- Header with Caley Logo -->
          <tr>
            <td style="padding: 48px 40px 32px; text-align: center; background: linear-gradient(135deg, #3467D3 0%, #2B5AA0 100%);">
              <table role="presentation" style="width: 100%;">
                <tr>
                  <td align="center">
                    <img 
                      src="${fullLogoUrl}" 
                      alt="Caley" 
                      width="96" 
                      height="96" 
                    />
                    <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #ffffff; letter-spacing: 0.025em;">Caley</h1>
                    <p style="margin: 8px 0 0; font-size: 14px; color: rgba(255, 255, 255, 0.8); letter-spacing: 0.025em;">Professional Invoice Management</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 40px 32px;">
              <h2 style="margin: 0 0 24px; font-size: 24px; font-weight: 700; color: #171717; letter-spacing: 0.025em;">Reset Your Password</h2>
              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #404040; letter-spacing: 0.025em;">
                We received a request to reset the password for your account associated with <strong style="color: #171717;">${userEmail}</strong>.
              </p>
              <p style="margin: 0 0 32px; font-size: 16px; line-height: 1.6; color: #404040; letter-spacing: 0.025em;">
                Click the button below to create a new password:
              </p>
              
              <!-- Button -->
              <table role="presentation" style="margin: 0 0 32px; width: 100%;">
                <tr>
                  <td align="center">
                    <table role="presentation" style="border-collapse: separate;">
                      <tr>
                        <td style="border-radius: 18.8px; background: linear-gradient(135deg, #3467D3 0%, #2B5AA0 100%); box-shadow: 0 4px 12px rgba(52, 103, 211, 0.3);">
                          <a href="${resetUrl}" target="_blank" style="display: inline-block; padding: 8px 12px; font-size: 16px; font-weight: 500; color: #ffffff; text-decoration: none; letter-spacing: 0.025em; border-radius: 8px;">
                            Reset Password
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Divider -->
              <table role="presentation" style="width: 100%; margin: 32px 0;">
                <tr>
                  <td style="border-top: 1px solid #e5e5e5;"></td>
                </tr>
              </table>
              
              <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #737373; letter-spacing: 0.025em;">
                Or copy and paste this URL into your browser:
              </p>
              <p style="margin: 0 0 32px; font-size: 13px; line-height: 1.6; color: #3467D3; word-break: break-all; background-color: #f0f4ff; padding: 12px 16px; border-radius: 6px; border-left: 3px solid #3467D3; letter-spacing: 0.025em;">
                ${resetUrl}
              </p>
              
              <!-- Security Notice -->
              <table role="presentation" style="width: 100%; background-color: #f0f4ff; border-radius: 8px; border-left: 4px solid #3467D3;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <p style="margin: 0 0 8px; font-size: 14px; font-weight: 500; line-height: 1.6; color: #171717; letter-spacing: 0.025em;">
                      🔒 Security Notice
                    </p>
                    <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #737373; letter-spacing: 0.025em;">
                      This link will expire in <strong>1 hour</strong> for your security. If you didn't request this password reset, please ignore this email and your password will remain unchanged.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px 40px; border-top: 1px solid #e5e5e5; background-color: #fafafa;">
              <p style="margin: 0 0 8px; font-size: 12px; line-height: 1.5; color: #a3a3a3; text-align: center; letter-spacing: 0.025em;">
                © ${new Date().getFullYear()} Caley. All rights reserved.
              </p>
              <p style="margin: 0; font-size: 11px; line-height: 1.5; color: #a3a3a3; text-align: center; letter-spacing: 0.025em;">
                Professional invoice management for freelancers and businesses
              </p>
            </td>
          </tr>
        </table>
        
        <!-- Email client spacer -->
        <table role="presentation" style="width: 600px; max-width: 100%;">
          <tr>
            <td style="padding: 24px 40px; text-align: center;">
              <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #a3a3a3; letter-spacing: 0.025em;">
                Need help? Contact support or visit our help center
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
};

export const getPasswordResetEmailText = ({
  resetUrl,
  userEmail,
}: PasswordResetEmailProps): string => {
  return `
CALEY
=====

RESET YOUR PASSWORD
-------------------

We received a request to reset the password for your account associated with ${userEmail}.

Click the link below to create a new password:

${resetUrl}

🔒 SECURITY NOTICE

This link will expire in 1 hour for your security. If you didn't request this password reset, please ignore this email and your password will remain unchanged.

---

© ${new Date().getFullYear()} Caley. All rights reserved.
Professional invoice management for freelancers and businesses

Need help? Contact support or visit our help center
  `.trim();
};
