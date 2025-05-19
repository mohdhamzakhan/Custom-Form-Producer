import { useState, useCallback } from 'react';
import { APP_CONSTANTS } from "../store";

const useAdSearch = () => {
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [error, setError] = useState(null);

    const searchAdDirectory = useCallback(async (term) => {
        setIsSearching(true);
        setError(null);

        try {
            const response = await fetch(`${APP_CONSTANTS.API_BASE_URL}/api/forms/ad-search?term=${encodeURIComponent(term)}`);

            let data;
            try {
                data = await response.json();
            } catch (jsonError) {
                console.error("Invalid JSON returned from server:", jsonError);
                throw new Error("Invalid JSON response");
            }

            if (!response.ok) {
                throw new Error(data.error || "Unknown server error");
            }

            setSearchResults(data);
            return data;
        } catch (error) {
            console.error("Error searching AD:", error);
            setError(error.message);

            // Provide dummy data for testing
            const dummyData = [
                { id: "user1", name: "John Doe", type: "user", email: "john.doe@example.com" },
                { id: "user2", name: "Jane Smith", type: "user", email: "jane.smith@example.com" },
                { id: "group1", name: "Finance Department", type: "group", members: ["user1", "user3"] },
                { id: "group2", name: "HR Team", type: "group", members: ["user2", "user4"] }
            ];

            setSearchResults(dummyData);
            return dummyData;
        } finally {
            setIsSearching(false);
        }
    }, []);

    return {
        searchResults,
        isSearching,
        error,
        searchAdDirectory
    };
};

export default useAdSearch;