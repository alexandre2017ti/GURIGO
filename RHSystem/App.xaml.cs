using System.Configuration;
using System.Data;
using System.Windows;
using System.Windows.Threading;

namespace RHSystem
{
    /// <summary>
    /// Interaction logic for App.xaml
    /// </summary>
    public partial class App : Application
    {
        protected override void OnStartup(StartupEventArgs e)
        {
            base.OnStartup(e);

            // ✨ LIGA O ESCUDO GLOBAL DE ERROS
            this.DispatcherUnhandledException += App_DispatcherUnhandledException;

            // Tratamento para erros em Threads secundárias (Tasks/Background)
            AppDomain.CurrentDomain.UnhandledException += CurrentDomain_UnhandledException;
        }
        private void App_DispatcherUnhandledException(object sender, DispatcherUnhandledExceptionEventArgs e)
        {
            // 1. Grava o erro silenciosamente no arquivo de log (Logs.txt)
            LoggerService.Log($"[FATAL CRASH TELA] {e.Exception.Message}\n{e.Exception.StackTrace}");

            // 2. Opcional: Mostra uma mensagem pro usuário ou só ignora pra não fechar o app
            // MessageBox.Show("Ops! Ocorreu um erro interno, mas o sistema continuará rodando. O suporte já foi notificado nos logs.", "Aviso", MessageBoxButton.OK, MessageBoxImage.Warning);

            // 3. DIZ PARA O WINDOWS: "Deixa comigo, não precisa fechar o aplicativo!"
            e.Handled = true;
        }

        private void CurrentDomain_UnhandledException(object sender, UnhandledExceptionEventArgs e)
        {
            if (e.ExceptionObject is Exception ex)
            {
                LoggerService.Log($"[FATAL CRASH BACKGROUND] {ex.Message}\n{ex.StackTrace}");
            }
        }
    }

}
