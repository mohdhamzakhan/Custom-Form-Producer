using System;
using System.Collections.Generic;
using System.DirectoryServices.AccountManagement;
using System.Linq;
using System.Runtime.Versioning;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;

namespace productionLine.Server.Service
{
    [SupportedOSPlatform("windows")]
    public class AdDirectoryService : IAdDirectoryService
    {
        private readonly ILogger<AdDirectoryService> _logger;

        public AdDirectoryService(ILogger<AdDirectoryService> logger)
        {
            _logger = logger;
        }

        // ── Search users + groups ────────────────────────────────────────
        public Task<List<AdSearchResult>> SearchAsync(string term)
        {
            var results = new List<AdSearchResult>();

            if (string.IsNullOrWhiteSpace(term))
                return Task.FromResult(results);

            try
            {
                using var context = new PrincipalContext(ContextType.Domain);

                // ── Users ────────────────────────────────────────────────
                using (var searcher = new PrincipalSearcher(new UserPrincipal(context)))
                {
                    var users = searcher.FindAll()
                        .OfType<UserPrincipal>()
                        .Where(u => u.DisplayName != null &&
                                    u.DisplayName.Contains(term, StringComparison.OrdinalIgnoreCase))
                        .Take(10)
                        .Select(u => new AdSearchResult
                        {
                            Id = u.Sid.ToString(),
                            Name = u.SamAccountName,
                            Type = "user",
                            Email = u.EmailAddress ?? u.UserPrincipalName ?? string.Empty
                        })
                        .ToList();

                    results.AddRange(users);
                }

                // ── Groups ───────────────────────────────────────────────
                using (var searcher = new PrincipalSearcher(new GroupPrincipal(context)))
                {
                    var groups = searcher.FindAll()
                        .OfType<GroupPrincipal>()
                        .Where(g => g.Name != null &&
                                    g.Name.Contains(term, StringComparison.OrdinalIgnoreCase))
                        .Take(10)
                        .Select(g => new AdSearchResult
                        {
                            Id = g.Sid.ToString(),
                            Name = g.Name,
                            Type = "group",
                            Email = "abc@meai-india.com",
                            Members = g.Members
                                .Select(m => new AdMember
                                {
                                    Name = m.DisplayName ?? m.Name ?? string.Empty,
                                    Email = (m as UserPrincipal)?.EmailAddress ?? string.Empty
                                })
                                .ToList()
                        })
                        .ToList();

                    results.AddRange(groups);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error searching Active Directory for term: {Term}", term);
                throw;
            }

            return Task.FromResult(results);
        }

        // ── Expand group members (used by email scheduler) ───────────────
        public Task<List<AdMember>> GetGroupMembersAsync(string groupIdentifier)
        {
            var members = new List<AdMember>();

            if (string.IsNullOrWhiteSpace(groupIdentifier))
                return Task.FromResult(members);

            try
            {
                using var context = new PrincipalContext(ContextType.Domain);

                // Try find by SID first, fall back to SamAccountName
                GroupPrincipal? group = null;

                try
                {
                    var sid = new System.Security.Principal.SecurityIdentifier(groupIdentifier);
                    group = GroupPrincipal.FindByIdentity(context, IdentityType.Sid, groupIdentifier);
                }
                catch (ArgumentException)
                {
                    // Not a SID — try by name
                    group = GroupPrincipal.FindByIdentity(context, IdentityType.SamAccountName, groupIdentifier);
                }

                if (group == null)
                {
                    _logger.LogWarning("AD group not found: {GroupIdentifier}", groupIdentifier);
                    return Task.FromResult(members);
                }

                members = group.Members
                    .OfType<UserPrincipal>()
                    .Where(m => !string.IsNullOrEmpty(m.EmailAddress))
                    .Select(m => new AdMember
                    {
                        Name = m.DisplayName ?? m.SamAccountName ?? string.Empty,
                        Email = m.EmailAddress!
                    })
                    .ToList();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching members for group: {GroupIdentifier}", groupIdentifier);
                throw;
            }

            return Task.FromResult(members);
        }
    }
}