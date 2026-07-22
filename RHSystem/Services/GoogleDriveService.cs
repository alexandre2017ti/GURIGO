using Google.Apis.Auth.OAuth2;
using Google.Apis.Drive.v3;
using Google.Apis.Services;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;

namespace RHSystem.Services
{
    public class GoogleDriveService
    {
        private DriveService _driveService;
        private bool _isInitialized = false;

        public GoogleDriveService()
        {
            // O construtor fica vazio para não travar a MainWindow no início
        }

        // Método interno para inicializar apenas quando precisar de fato
        private void EnsureInitialized()
        {
            if (_isInitialized && _driveService != null) return;

            try
            {
                string credPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "credentials.json");

                if (!File.Exists(credPath))
                    throw new FileNotFoundException("Arquivo credentials.json não encontrado na pasta raiz.");

                GoogleCredential credential;
                using (var stream = new FileStream(credPath, FileMode.Open, FileAccess.Read))
                {
                    credential = GoogleCredential.FromStream(stream)
                        .CreateScoped(DriveService.ScopeConstants.Drive);
                }

                _driveService = new DriveService(new BaseClientService.Initializer()
                {
                    HttpClientInitializer = credential,
                    ApplicationName = "RHSystem Desktop"
                });

                _isInitialized = true;
            }
            catch (Exception ex)
            {
                _isInitialized = false;
                // Lançamos uma exceção amigável aqui
                throw new Exception("Erro ao configurar Google Drive. Verifique o arquivo credentials.json. Detalhes: " + ex.Message);
            }
        }
        // ✨ 1. VERIFICA SE A PASTA EXISTE, SE NÃO, CRIA!
        private async Task<string> GetOrCreateFolderAsync(string folderName, string parentFolderId)
        {
            EnsureInitialized();
            // Busca para ver se já existe uma pasta com esse nome dentro do parentId
            var request = _driveService.Files.List();
            request.Q = $"mimeType='application/vnd.google-apps.folder' and trashed=false and name='{folderName}' and '{parentFolderId}' in parents";
            request.Spaces = "drive";
            request.Fields = "files(id, name)";

            var result = await request.ExecuteAsync();
            var folder = result.Files.FirstOrDefault();

            if (folder != null)
            {
                return folder.Id; // Já existe, retorna o ID dela
            }

            // Não existe, vamos criar
            var folderMetadata = new Google.Apis.Drive.v3.Data.File()
            {
                Name = folderName,
                MimeType = "application/vnd.google-apps.folder",
                Parents = new List<string> { parentFolderId }
            };

            var createRequest = _driveService.Files.Create(folderMetadata);
            createRequest.Fields = "id";
            var newFolder = await createRequest.ExecuteAsync();

            return newFolder.Id;
        }

        // ✨ 2. O UPLOAD HIERÁRQUICO INTELIGENTE
        public async Task<string> UploadFileHierarchicalAsync(Stream fileStream, string fileName, string mimeType, string rootFolderId, string categoryName, string employeeName)
        {
            EnsureInitialized();
            // Nível 1: Entra na raiz e busca/cria a pasta da Categoria (Ex: "Atestados")
            string categoryFolderId = await GetOrCreateFolderAsync(categoryName, rootFolderId);

            // Nível 2: Entra na pasta da Categoria e busca/cria a pasta do Funcionário (Ex: "Alexandre")
            string employeeFolderId = await GetOrCreateFolderAsync(employeeName, categoryFolderId);

            // Nível 3: Faz o upload do arquivo dentro da pasta do funcionário
            var fileMetadata = new Google.Apis.Drive.v3.Data.File()
            {
                Name = fileName,
                Parents = new List<string> { employeeFolderId }
            };

            var request = _driveService.Files.Create(fileMetadata, fileStream, mimeType);
            request.Fields = "id";
            var response = await request.UploadAsync();

            if (response.Status != Google.Apis.Upload.UploadStatus.Completed)
            {
                throw new Exception("Falha no upload do Google Drive: " + response.Exception?.Message);
            }

            return request.ResponseBody.Id;
        }
    }
}