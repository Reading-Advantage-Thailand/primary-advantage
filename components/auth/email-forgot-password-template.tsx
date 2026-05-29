import * as React from "react";

interface EmailTemplateProps {
  firstName: string;
}

/**
 * Renders a simple email template with a welcome message for password reset.
 * @param firstName - The recipient's first name to personalize the message
 */
export function EmailTemplate({ firstName }: EmailTemplateProps) {
  return (
    <div>
      <h1>Welcome, {firstName}!</h1>
    </div>
  );
}
