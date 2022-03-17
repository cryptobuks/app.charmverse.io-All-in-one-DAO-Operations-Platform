import styled from '@emotion/styled';
import Table from '@mui/material/Table';

const StyledTable = styled(Table)`
  .row-actions {
    opacity: 0;
    transition: opacity 0.2s ease-in-out;
  }
  tbody tr:hover .row-actions {
    opacity: 1;
  }
  tbody tr:last-child td {
    border: 0;
  }
`;

export default StyledTable;
