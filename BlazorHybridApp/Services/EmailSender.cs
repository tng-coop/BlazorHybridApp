using Microsoft.AspNetCore.Identity.UI.Services;
using MimeKit;
using MailKit.Net.Smtp;
using MailKit.Security;

namespace BlazorHybridApp.Services;

public class EmailSender(IConfiguration configuration) : IEmailSender
{
    private readonly IConfiguration _configuration = configuration;

    public async Task SendEmailAsync(string email, string subject, string htmlMessage)
    {
        var smtpServer = _configuration["SmtpSettings:Server"];

        if (!int.TryParse(_configuration["SmtpSettings:Port"], out var smtpPort))
        {
            throw new InvalidOperationException("Invalid SMTP port configuration.");
        }

        var smtpUser = _configuration["SmtpSettings:User"];
        var smtpPass = _configuration["SmtpSettings:Password"];
        var fromEmail = _configuration["SmtpSettings:FromEmail"];
        var useStartTls = bool.TryParse(_configuration["SmtpSettings:UseStartTls"], out var startTls) && startTls;

        var message = new MimeMessage();
        message.From.Add(MailboxAddress.Parse(fromEmail));
        message.To.Add(MailboxAddress.Parse(email));
        message.Subject = subject;
        message.Body = new TextPart("html") { Text = htmlMessage };

        using var smtpClient = new SmtpClient();

        if (useStartTls)
        {
            await smtpClient.ConnectAsync(smtpServer, smtpPort, SecureSocketOptions.StartTls);
        }
        else
        {
            await smtpClient.ConnectAsync(smtpServer, smtpPort, SecureSocketOptions.Auto);
        }

        if (!string.IsNullOrWhiteSpace(smtpUser))
        {
            await smtpClient.AuthenticateAsync(smtpUser, smtpPass);
        }

        await smtpClient.SendAsync(message);
        await smtpClient.DisconnectAsync(true);
    }
}
