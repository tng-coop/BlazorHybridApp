using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace BlazorHybridApp.Data;

public class ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : IdentityDbContext<ApplicationUser>(options)
{
    public DbSet<BackgroundVideo> BackgroundVideos => Set<BackgroundVideo>();
    public DbSet<HtmlContent> HtmlContents => Set<HtmlContent>();
    public DbSet<BranchOfficeContent> BranchOfficeContents => Set<BranchOfficeContent>();
}
