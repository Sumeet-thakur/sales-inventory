using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.SwaggerGen;

namespace SalesInventoryAPI.Filters
{
    public class FileUploadOperationFilter : IOperationFilter
    {
        public void Apply(OpenApiOperation operation, OperationFilterContext context)
        {
            // Check if the action has parameters of type IFormFile or IFormFile[]
            var fileParameters = context.MethodInfo.GetParameters()
                .Where(p => p.ParameterType == typeof(IFormFile) || p.ParameterType == typeof(IFormFile[]))
                .ToList();

            if (fileParameters.Any())
            {
                operation.RequestBody = new OpenApiRequestBody
                {
                    Content =
                {
                    ["multipart/form-data"] = new OpenApiMediaType
                    {
                        Schema = new OpenApiSchema
                        {
                            Type = "object",
                            Properties = fileParameters.ToDictionary(
                                keySelector: p => p.Name,
                                elementSelector: p => new OpenApiSchema
                                {
                                    Type = "string",
                                    Format = "binary"
                                })
                        }
                    }
                }
                };
            }
        }
    }
}
