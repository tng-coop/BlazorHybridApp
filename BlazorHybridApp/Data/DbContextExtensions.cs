using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Reflection;

namespace BlazorHybridApp.Data;

public static class DbContextExtensions
{
    public static IQueryable<object> GetQueryable(this DbContext context, Type entityType)
    {
        var method = typeof(DbContext).GetMethods()
            .First(m => m.Name == nameof(DbContext.Set) && m.IsGenericMethod && m.GetParameters().Length == 0);
        var generic = method.MakeGenericMethod(entityType);
        return (IQueryable<object>)(generic.Invoke(context, null) ?? throw new InvalidOperationException($"Could not create set for {entityType.Name}"));
    }
}
