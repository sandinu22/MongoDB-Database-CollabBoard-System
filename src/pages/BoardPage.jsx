import React, { useEffect } from "react";
import { useParams } from "react-router-dom";
import Board from "../components/Board";
import { useBoardData } from "../context/BoardDataContext";

function BoardPage() {
  const { boardId } = useParams();
  const { selectedBoardId, selectBoard, boards } = useBoardData();
  useEffect(() => {
    if (boardId && boardId !== selectedBoardId && boards.some((board) => board.id === boardId)) selectBoard(boardId);
  }, [boardId, selectedBoardId, boards, selectBoard]);
  return <div className="board-page"><Board /></div>;
}
export default BoardPage;
