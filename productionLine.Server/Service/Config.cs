namespace productionLine.Server.Service
{
    // Services/QuantityMultiplierService.cs
    public static class QuantityMultiplierService
    {
        private static readonly string MultiplierFilePath =
            Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "quantity_multiplier.txt");

        public static double GetMultiplier()
        {
            try
            {
                if (!File.Exists(MultiplierFilePath))
                {
                    // File doesn't exist — create it with default multiplier of 1
                    File.WriteAllText(MultiplierFilePath, "1");
                    Console.WriteLine($"[Multiplier] File not found. Created with default multiplier=1 at {MultiplierFilePath}");
                    return 1.0;
                }

                var content = File.ReadAllText(MultiplierFilePath).Trim();
                if (double.TryParse(content, out double multiplier) && multiplier > 0)
                {
                    Console.WriteLine($"[Multiplier] Loaded multiplier={multiplier}");
                    return multiplier;
                }

                Console.WriteLine($"[Multiplier] Invalid value '{content}' in file. Defaulting to 1.");
                return 1.0;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[Multiplier] Error reading file: {ex.Message}. Defaulting to 1.");
                return 1.0;
            }
        }
    }
}
