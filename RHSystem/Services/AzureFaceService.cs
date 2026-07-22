using System;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace RHSystem.Services
{
    public class AzureFaceService
    {
        // ✨ COLE AQUI OS SEUS DADOS DA AZURE
        private readonly string _azureKey = "COLOQUE_SUA_CHAVE_AQUI";
        private readonly string _endpoint = "https://rh-facial.cognitiveservices.azure.com/";

        private readonly HttpClient _client;

        public AzureFaceService()
        {
            _client = new HttpClient();
            _client.DefaultRequestHeaders.Add("Ocp-Apim-Subscription-Key", _subscriptionKey);
        }

        // Função Mestra: Recebe o Gabarito e a Foto da Hora do Ponto
        public async Task<bool> VerifyFaceAsync(string base64Reference, string base64Captured)
        {
            try
            {
                if (string.IsNullOrEmpty(base64Reference) || string.IsNullOrEmpty(base64Captured))
                    return false;

                // 1. A Azure lê a foto do cadastro e extrai a "geometria" do rosto (FaceId)
                string faceId1 = await DetectFaceIdAsync(base64Reference);
                if (string.IsNullOrEmpty(faceId1)) return false; // Ninguém na foto de cadastro

                // 2. A Azure lê a foto tirada no momento da batida do ponto
                string faceId2 = await DetectFaceIdAsync(base64Captured);
                if (string.IsNullOrEmpty(faceId2)) return false; // Ninguém na frente do relógio

                // 3. A IA compara as duas geometrias
                return await CompareFacesAsync(faceId1, faceId2);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Erro na Biometria: {ex.Message}");
                return false;
            }
        }

        private async Task<string> DetectFaceIdAsync(string base64Image)
        {
            // Tira o cabeçalho "data:image/jpeg;base64," se ele vier do React
            if (base64Image.Contains(",")) base64Image = base64Image.Split(',')[1];

            string url = $"{_endpoint}/face/v1.0/detect?returnFaceId=true";

            byte[] byteData = Convert.FromBase64String(base64Image);
            using var content = new ByteArrayContent(byteData);
            content.Headers.ContentType = new MediaTypeHeaderValue("application/octet-stream");

            var response = await _client.PostAsync(url, content);
            string responseStr = await response.Content.ReadAsStringAsync();

            if (response.IsSuccessStatusCode)
            {
                using var doc = JsonDocument.Parse(responseStr);
                if (doc.RootElement.GetArrayLength() > 0)
                {
                    return doc.RootElement[0].GetProperty("faceId").GetString();
                }
            }
            return null;
        }

        private async Task<bool> CompareFacesAsync(string faceId1, string faceId2)
        {
            string url = $"{_endpoint}/face/v1.0/verify";

            var body = new { faceId1 = faceId1, faceId2 = faceId2 };
            string jsonBody = JsonSerializer.Serialize(body);

            using var content = new StringContent(jsonBody, Encoding.UTF8, "application/json");

            var response = await _client.PostAsync(url, content);
            string responseStr = await response.Content.ReadAsStringAsync();

            if (response.IsSuccessStatusCode)
            {
                using var doc = JsonDocument.Parse(responseStr);
                bool isIdentical = doc.RootElement.GetProperty("isIdentical").GetBoolean();
                double confidence = doc.RootElement.GetProperty("confidence").GetDouble();

                Console.WriteLine($"🔍 IA Análise -> Idênticos: {isIdentical} | Confiança: {confidence * 100}%");

                // ✨ Nível de Segurança: Tem que ser a mesma pessoa E ter mais de 60% de certeza visual
                return isIdentical && confidence > 0.6;
            }

            return false;
        }
    }
}