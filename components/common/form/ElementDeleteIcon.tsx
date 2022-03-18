import DeleteIcon from '@mui/icons-material/Close';
import Tooltip from '@mui/material/Tooltip';
import ButtonChip from 'components/common/ButtonChip';

interface Props {
  clicked: () => void
}

export function ElementDeleteIcon ({ clicked }: Props) {

  return (
    <Tooltip arrow placement='top' title='Delete'>
      <ButtonChip
        className='row-actions'
        icon={<DeleteIcon />}
        clickable
        color='secondary'
        size='small'
        variant='outlined'
        onClick={(e) => {
          e.stopPropagation();
          clicked();
        }}
      />
    </Tooltip>
  );

}
