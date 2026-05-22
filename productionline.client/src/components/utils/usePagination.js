import { useState } from "react";

export function usePagination(pageSize = 10) {
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    const reset = () => setPage(1);

    return { page, setPage, totalPages, setTotalPages, totalCount, setTotalCount, pageSize, reset };
}