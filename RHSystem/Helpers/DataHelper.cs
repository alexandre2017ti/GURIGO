namespace RHSystem.Helpers
{
    public static class DataHelper
    {
        // Remove tudo que não for número (útil para CPF, CNPJ e PIN)
        public static string OnlyNumbers(string input)
        {
            if (string.IsNullOrEmpty(input)) return "";
            return new string(input.Where(char.IsDigit).ToArray());
        }

        // Garante que o texto esteja em Caps Lock e sem espaços sobrando
        public static string SanitizeName(string name)
        {
            if (string.IsNullOrEmpty(name)) return "NÃO INFORMADO";
            return name.Trim().ToUpper();
        }
    }
}