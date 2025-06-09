namespace BlazorHybridApp.Data;

public class BranchOfficeContent : IContent
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public string Address { get; set; } = string.Empty;
}
