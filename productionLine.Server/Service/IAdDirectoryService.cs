using System.Collections.Generic;
using System.Threading.Tasks;

namespace productionLine.Server.Service
{
    public interface IAdDirectoryService
    {
        /// <summary>
        /// Search AD users and groups by display name or group name.
        /// </summary>
        Task<List<AdSearchResult>> SearchAsync(string term);

        /// <summary>
        /// Get all members of an AD group by the group's SID or SamAccountName.
        /// Used by the email scheduler to expand groups at send-time.
        /// </summary>
        Task<List<AdMember>> GetGroupMembersAsync(string groupIdentifier);
    }

    // ── Result models ────────────────────────────────────────────────

    public class AdSearchResult
    {
        public string Id { get; set; }   // SID string
        public string Name { get; set; }   // SamAccountName (user) or Name (group)
        public string Type { get; set; }   // "user" | "group"
        public string Email { get; set; }
        public List<AdMember> Members { get; set; } = new();
    }

    public class AdMember
    {
        public string Name { get; set; }
        public string Email { get; set; }
    }
}