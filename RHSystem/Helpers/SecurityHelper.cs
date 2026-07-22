using System;
using System.Text;
using System.Security.Cryptography;

namespace RHSystem.Helpers
{
    public static class SecurityHelper
    {
        // Criptografa usando a "Alma" da máquina atual
        public static string Encrypt(string plainText)
        {
            try
            {
                byte[] data = Encoding.UTF8.GetBytes(plainText);

                // DataProtectionScope.LocalMachine: Qualquer usuário nesta máquina consegue ler (bom para Kiosk)
                // DataProtectionScope.CurrentUser: Só o usuário logado consegue ler (mais seguro)
                byte[] encrypted = ProtectedData.Protect(data, null, DataProtectionScope.LocalMachine);

                return Convert.ToBase64String(encrypted);
            }
            catch
            {
                return null;
            }
        }

        public static string Decrypt(string cipherText)
        {
            try
            {
                byte[] data = Convert.FromBase64String(cipherText);

                // O Windows usa a chave interna dele para descriptografar
                byte[] decrypted = ProtectedData.Unprotect(data, null, DataProtectionScope.LocalMachine);

                return Encoding.UTF8.GetString(decrypted);
            }
            catch
            {
                return null; // Se falhar (arquivo de outra máquina ou corrompido), retorna nulo
            }
        }

        public static bool ValidateAdminPassword(string inputPassword)
        {
            // Gere este hash num site "SHA256 Generator" com sua senha real
            // Exemplo: Hash da senha "RhSystem2026!"
            string hashReal = "8d51767ed5fbaf636c8aec79275b9fa973cdf9cf657c24731e106a78d4b2203a";

            using (SHA256 sha256 = SHA256.Create())
            {
                byte[] bytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(inputPassword));
                StringBuilder builder = new StringBuilder();
                foreach (var b in bytes) builder.Append(b.ToString("x2"));

                return builder.ToString() == hashReal;
            }
        }
    }
}